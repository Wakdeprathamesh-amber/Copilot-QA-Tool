from flask import Flask, request, jsonify
from flask_cors import CORS
from database import DatabaseConnect
from datetime import datetime
import yaml

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Load config
with open('config.yaml', 'r') as file:
    config = yaml.safe_load(file)

db = DatabaseConnect()

# In-memory storage for QA assessments (temporary)
qa_assessments = {}

def map_channel(source_details):
    """Map channel from source_details"""
    if not source_details:
        return 'website'
    channel = source_details.get('channel', '')
    if channel == 'whatsapp':
        return 'whatsapp'
    return 'website'  # zd:answerBot, web -> website

def map_csat(evaluation):
    """Map CSAT from evaluation"""
    if not evaluation:
        return None
    satisfaction = evaluation.get('customer_satisfaction')
    if not satisfaction:
        return None
    try:
        score = int(satisfaction)
        if score >= 4:
            return 'good'
        elif score <= 2:
            return 'bad'
        return None  # 3 is neutral
    except:
        return None

def map_outcome(evaluation, status):
    """Map outcome from evaluation and status"""
    if evaluation:
        resolution = evaluation.get('resolution_status')
        if resolution == 'resolved':
            return 'qualified'
        elif resolution == 'unresolved':
            return 'dropped'
        elif resolution == 'escalated':
            return 'escalated'
    if status == 'open':
        return 'ongoing'
    return 'ongoing'

def map_sender(direction, agent_id):
    """Map sender from direction and agent_id"""
    if direction == 'inbound':
        return 'user'
    elif direction == 'outbound' and agent_id:
        return 'human'
    elif direction == 'outbound':
        return 'ai'
    return 'user' if not agent_id else 'human'

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        db.execute_query('SELECT 1')
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'timestamp': datetime.now().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 500

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get conversations with filters"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 50))
        search = request.args.get('search', '')
        
        # Build WHERE clause
        where_conditions = [
            "wc.source_details IS NOT NULL",
            "wc.source_details NOT IN ('', 'null')",
            "wc.source_details LIKE '{%'",
            "wc.source_details LIKE '%\"source\": \"zoho\"%'"
        ]
        params = []
        
        # Search filter
        if search:
            where_conditions.append("""(
                LOWER(wc.conversation_id) LIKE %s OR
                LOWER(wc.conversation_evaluation->>'summary') LIKE %s OR
                LOWER(wc.conversation_evaluation->'theme'->>'main_theme') LIKE %s
            )""")
            search_pattern = f'%{search.lower()}%'
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Channel filter
        channels = request.args.getlist('channel')
        if channels:
            channel_conditions = []
            for ch in channels:
                if ch == 'website':
                    channel_conditions.append("wc.source_details->>'channel' IN ('zd:answerBot', 'web')")
                elif ch == 'whatsapp':
                    channel_conditions.append("wc.source_details->>'channel' = 'whatsapp'")
            if channel_conditions:
                where_conditions.append(f"({' OR '.join(channel_conditions)})")
        
        # Date filters
        date_from = request.args.get('dateFrom')
        if date_from:
            where_conditions.append("wc.created_at >= %s")
            params.append(date_from)
        
        date_to = request.args.get('dateTo')
        if date_to:
            where_conditions.append("wc.created_at <= %s")
            params.append(date_to)
        
        where_clause = ' AND '.join(where_conditions)
        
        # Count total
        count_query = f"""
            SELECT COUNT(*) as total
            FROM whatsapp_conversations wc
            WHERE {where_clause}
        """
        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0]['total']
        
        # Fetch conversations
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                wc.conversation_id,
                wc.created_at,
                wc.last_message_at,
                wc.status,
                wc.source_details,
                wc.conversation_evaluation,
                wc.tags,
                COUNT(wm.id) as message_count,
                MAX(wm.created_at) as last_message_time,
                MAX(CASE WHEN wm.agent_id IS NOT NULL THEN 1 ELSE 0 END) as has_human_agent
            FROM whatsapp_conversations wc
            LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
            WHERE {where_clause}
            GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, wc.status, 
                     wc.source_details, wc.conversation_evaluation, wc.tags
            ORDER BY wc.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([page_size, offset])
        
        rows = db.execute_query(list_query, tuple(params))
        
        # Map to frontend format
        conversations = []
        for row in rows:
            evaluation = row.get('conversation_evaluation') or {}
            source_details = row.get('source_details') or {}
            
            conversations.append({
                'id': row['conversation_id'],
                'channel': map_channel(source_details),
                'startTime': row['created_at'].isoformat() if row['created_at'] else None,
                'endTime': row['last_message_time'].isoformat() if row.get('last_message_time') else None,
                'participantCount': 1,
                'aiAgentVersion': 'v1.0.0',
                'promptVersion': 'v1.0.0',
                'kbVersion': 'v1.0.0',
                'detectedIntent': evaluation.get('theme', {}).get('main_theme'),
                'outcome': map_outcome(evaluation, row['status']),
                'csat': map_csat(evaluation),
                'humanHandover': row.get('has_human_agent') == 1,
                'interactionType': 'ai_to_human_handover' if row.get('has_human_agent') == 1 else 'ai_only',
                'autoSummary': evaluation.get('summary'),
                'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                'updatedAt': row['created_at'].isoformat() if row['created_at'] else None,
                'messageCount': row.get('message_count', 0),
                'lastMessageTime': row['last_message_time'].isoformat() if row.get('last_message_time') else None,
            })
        
        return jsonify({
            'data': {
                'conversations': conversations,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        })
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Get conversation by ID with optional messages"""
    try:
        include_messages = request.args.get('messages') == 'true'
        
        # Get conversation
        query = """
            SELECT 
                wc.conversation_id,
                wc.created_at,
                wc.last_message_at,
                wc.status,
                wc.source_details,
                wc.conversation_evaluation,
                wc.tags,
                COUNT(wm.id) as message_count,
                MAX(wm.created_at) as last_message_time,
                MAX(CASE WHEN wm.agent_id IS NOT NULL THEN 1 ELSE 0 END) as has_human_agent
            FROM whatsapp_conversations wc
            LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
            WHERE wc.conversation_id = %s
              AND wc.source_details IS NOT NULL
              AND wc.source_details NOT IN ('', 'null')
              AND wc.source_details LIKE '{%'
              AND wc.source_details LIKE '%"source": "zoho"%'
            GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, wc.status, 
                     wc.source_details, wc.conversation_evaluation, wc.tags
        """
        
        rows = db.execute_query(query, (conversation_id,))
        
        if not rows:
            return jsonify({'error': 'Conversation not found'}), 404
        
        row = rows[0]
        evaluation = row.get('conversation_evaluation') or {}
        source_details = row.get('source_details') or {}
        
        conversation = {
            'id': row['conversation_id'],
            'channel': map_channel(source_details),
            'startTime': row['created_at'].isoformat() if row['created_at'] else None,
            'endTime': row['last_message_time'].isoformat() if row.get('last_message_time') else None,
            'participantCount': 1,
            'aiAgentVersion': 'v1.0.0',
            'promptVersion': 'v1.0.0',
            'kbVersion': 'v1.0.0',
            'detectedIntent': evaluation.get('theme', {}).get('main_theme'),
            'outcome': map_outcome(evaluation, row['status']),
            'csat': map_csat(evaluation),
            'humanHandover': row.get('has_human_agent') == 1,
            'interactionType': 'ai_to_human_handover' if row.get('has_human_agent') == 1 else 'ai_only',
            'autoSummary': evaluation.get('summary'),
            'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
            'updatedAt': row['created_at'].isoformat() if row['created_at'] else None,
        }
        
        # Get messages if requested
        if include_messages:
            messages_query = """
                SELECT 
                    wm.id,
                    wm.conversation_id,
                    wm.message_content,
                    wm.created_at,
                    wm.message_type,
                    wm.direction,
                    wm.agent_id
                FROM whatsapp_messages wm
                INNER JOIN whatsapp_conversations wc ON wm.conversation_id = wc.conversation_id
                WHERE wm.conversation_id = %s
                  AND wc.source_details IS NOT NULL
                  AND wc.source_details NOT IN ('', 'null')
                  AND wc.source_details LIKE '{%'
                  AND wc.source_details LIKE '%"source": "zoho"%'
                ORDER BY wm.created_at ASC
            """
            
            message_rows = db.execute_query(messages_query, (conversation_id,))
            
            messages = []
            for msg in message_rows:
                sender = map_sender(msg.get('direction'), msg.get('agent_id'))
                messages.append({
                    'id': str(msg['id']),
                    'conversationId': msg['conversation_id'],
                    'sender': sender,
                    'content': msg.get('message_content', ''),
                    'timestamp': msg['created_at'].isoformat() if msg['created_at'] else None,
                    'messageType': 'text' if msg.get('message_type') == 'text' else 'file',
                    'processingLatency': None,
                    'langsmithTraceId': 'demo-trace-abc123' if sender == 'ai' else None,
                    'promptUsed': None,
                    'ragContext': None,
                    'modelOutput': None,
                    'toolCalls': None,
                    'errors': None,
                })
            
            conversation['messages'] = messages
        
        return jsonify({'data': conversation})
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations/filters', methods=['GET'])
def get_filter_options():
    """Get filter options"""
    try:
        # Get distinct intents
        intents_query = """
            SELECT DISTINCT conversation_evaluation->'theme'->>'main_theme' as intent
            FROM whatsapp_conversations
            WHERE conversation_evaluation->'theme'->>'main_theme' IS NOT NULL
              AND source_details IS NOT NULL
              AND source_details NOT IN ('', 'null')
              AND source_details LIKE '{%'
              AND source_details LIKE '%"source": "zoho"%'
            ORDER BY intent
        """
        intents_result = db.execute_query(intents_query)
        intents = [row['intent'] for row in intents_result if row['intent']]
        
        return jsonify({
            'data': {
                'csatOptions': [
                    {'value': 'good', 'label': 'Good'},
                    {'value': 'bad', 'label': 'Bad'},
                    {'value': None, 'label': 'No Rating'},
                ],
                'intentOptions': intents,
                'channelOptions': [
                    {'value': 'website', 'label': 'Website'},
                    {'value': 'whatsapp', 'label': 'WhatsApp'},
                ],
                'agentVersionOptions': ['v1.0.0'],
                'promptVersionOptions': ['v1.0.0'],
                'kbVersionOptions': ['v1.0.0'],
                'outcomeOptions': [
                    {'value': 'qualified', 'label': 'Qualified'},
                    {'value': 'dropped', 'label': 'Dropped'},
                    {'value': 'escalated', 'label': 'Escalated'},
                    {'value': 'ongoing', 'label': 'Ongoing'},
                ],
            }
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/<message_id>/debug', methods=['GET'])
def get_message_debug(message_id):
    """Get debug info for message"""
    return jsonify({
        'traceId': 'demo-trace-abc123',
        'prompt': None,
        'ragContext': None,
        'modelOutput': None,
        'toolCalls': None,
        'latency': None,
        'langsmithUrl': 'https://smith.langchain.com/o/demo/projects/p/demo/r/demo-trace-abc123',
    })

@app.route('/api/qa-assessments/<conversation_id>', methods=['GET'])
def get_qa_assessment(conversation_id):
    """Get QA assessment"""
    assessment = qa_assessments.get(conversation_id)
    if not assessment:
        return jsonify({'data': None})
    
    return jsonify({'data': assessment})

@app.route('/api/qa-assessments/<conversation_id>/rating', methods=['POST'])
def set_rating(conversation_id):
    """Set QA rating"""
    data = request.json
    rating = data.get('rating')
    
    if not qa_assessments.get(conversation_id):
        qa_assessments[conversation_id] = {
            'id': f'qa-{conversation_id}',
            'conversationId': conversation_id,
            'reviewerId': 'current-user',
            'tags': [],
            'notes': None,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
        }
    
    qa_assessments[conversation_id]['rating'] = rating
    qa_assessments[conversation_id]['updatedAt'] = datetime.now().isoformat()
    
    return jsonify({'data': qa_assessments[conversation_id]})

@app.route('/api/qa-assessments/<conversation_id>/tags', methods=['POST'])
def add_tags(conversation_id):
    """Add tags"""
    data = request.json
    tags = data.get('tags', [])
    
    if not qa_assessments.get(conversation_id):
        qa_assessments[conversation_id] = {
            'id': f'qa-{conversation_id}',
            'conversationId': conversation_id,
            'reviewerId': 'current-user',
            'rating': 'okay',
            'tags': [],
            'notes': None,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
        }
    
    existing_tags = qa_assessments[conversation_id].get('tags', [])
    for tag in tags:
        if tag not in existing_tags:
            existing_tags.append(tag)
    
    qa_assessments[conversation_id]['tags'] = existing_tags
    qa_assessments[conversation_id]['updatedAt'] = datetime.now().isoformat()
    
    return jsonify({'success': True})

@app.route('/api/qa-assessments/<conversation_id>/tags', methods=['DELETE'])
def remove_tags(conversation_id):
    """Remove tags"""
    data = request.json
    tags = data.get('tags', [])
    
    if qa_assessments.get(conversation_id):
        existing_tags = qa_assessments[conversation_id].get('tags', [])
        qa_assessments[conversation_id]['tags'] = [t for t in existing_tags if t not in tags]
        qa_assessments[conversation_id]['updatedAt'] = datetime.now().isoformat()
    
    return jsonify({'success': True})

@app.route('/api/qa-assessments/<conversation_id>/notes', methods=['POST'])
def set_notes(conversation_id):
    """Set notes"""
    data = request.json
    notes = data.get('notes')
    
    if not qa_assessments.get(conversation_id):
        qa_assessments[conversation_id] = {
            'id': f'qa-{conversation_id}',
            'conversationId': conversation_id,
            'reviewerId': 'current-user',
            'rating': 'okay',
            'tags': [],
            'notes': None,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
        }
    
    qa_assessments[conversation_id]['notes'] = notes
    qa_assessments[conversation_id]['updatedAt'] = datetime.now().isoformat()
    
    return jsonify({'data': qa_assessments[conversation_id]})

@app.route('/api/qa-assessments/<conversation_id>', methods=['PATCH'])
def update_assessment(conversation_id):
    """Update assessment"""
    data = request.json
    
    if not qa_assessments.get(conversation_id):
        qa_assessments[conversation_id] = {
            'id': f'qa-{conversation_id}',
            'conversationId': conversation_id,
            'reviewerId': 'current-user',
            'rating': 'okay',
            'tags': [],
            'notes': None,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
        }
    
    if 'rating' in data:
        qa_assessments[conversation_id]['rating'] = data['rating']
    if 'tags' in data:
        qa_assessments[conversation_id]['tags'] = data['tags']
    if 'notes' in data:
        qa_assessments[conversation_id]['notes'] = data['notes']
    
    qa_assessments[conversation_id]['updatedAt'] = datetime.now().isoformat()
    
    return jsonify({'data': qa_assessments[conversation_id]})

if __name__ == '__main__':
    server_config = config['server']
    app.run(
        host=server_config['HOST'],
        port=server_config['PORT'],
        debug=server_config['DEBUG']
    )
