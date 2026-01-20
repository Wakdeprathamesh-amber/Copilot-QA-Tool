# QA Testing Guide

Complete testing checklist for the QA Tool application.

---

## Prerequisites

✅ Backend running on port 5000  
✅ Frontend running on port 5173  
✅ Redshift credentials configured in `backend/.env`  
✅ QA tables created (`qa_assessments`)

---

## 1. Backend Testing

### Start Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✓ Environment loaded from: .../backend/.env
✓ Database connection successful
✓ Server running on port 5000
✓ Health check: http://localhost:5000/health
```

### Test Health Endpoint
```bash
curl http://localhost:5000/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

### Test API Endpoints

#### List Conversations
```bash
curl http://localhost:5000/api/conversations?page=1&pageSize=10
```

**Expected:** JSON with `{conversations: [...], total, page, pageSize}`

#### Get Single Conversation
```bash
curl http://localhost:5000/api/conversations/{CONVERSATION_ID}?messages=true
```

**Expected:** Conversation object with messages array

#### Create QA Assessment
```bash
curl -X POST http://localhost:5000/api/qa-assessments/{CONVERSATION_ID}/rating \
  -H "Content-Type: application/json" \
  -d '{"rating":"good"}'
```

**Expected:** `{data: {id, conversation_id, rating: "good", ...}}`

---

## 2. Frontend Testing

### Start Frontend
```bash
cd frontend
npm run dev
```

**Expected:** Frontend running at `http://localhost:5173`

### Test Conversation List

1. **Load Homepage**
   - ✅ See list of conversations (50 per page)
   - ✅ Pagination controls visible if >50 conversations
   - ✅ Conversations load within 5 seconds

2. **Filters**
   - ✅ CSAT filter works (Good/Bad/None)
   - ✅ Channel filter works (WhatsApp/Website)
   - ✅ Human Handover toggle works
   - ✅ Lead Created filter works
   - ✅ Date range picker works
   - ✅ Search by conversation ID works
   - ✅ Multiple filters can be combined

3. **Sorting**
   - ✅ Sort by Newest/Oldest
   - ✅ Sort by Most/Least Messages
   - ✅ Sort by Longest/Shortest Duration
   - ✅ Sort by Highest/Lowest CSAT

4. **Pagination**
   - ✅ Navigate to page 2 (should be faster due to cache!)
   - ✅ Navigate to page 3
   - ✅ Go back to page 1 (should be cached)
   - ✅ Page numbers display correctly

### Test Conversation Detail

1. **Open Conversation**
   - Click any conversation
   - ✅ Conversation loads within 3 seconds
   - ✅ Messages display correctly
   - ✅ User/AI/Human messages have different styling
   - ✅ Timestamps are formatted correctly
   - ✅ Summary displays (if available)

2. **QA Tools Panel** (Right Side)
   - ✅ Panel loads
   - ✅ Existing assessment loads (if previously rated)
   - ✅ Rating buttons (Good/Okay/Bad) are visible

### Test QA Rating

1. **Set Rating**
   - Click "Good"
   - ✅ Button highlights (green)
   - ✅ Save status shows "Saving..."
   - ✅ Save status shows "Saved!" (green checkmark)
   - ✅ Status disappears after 2 seconds

2. **Change Rating**
   - Click "Bad"
   - ✅ Previous rating deselects
   - ✅ New rating highlights (red)
   - ✅ Save confirmation appears

3. **Navigate Away and Back**
   - Go back to conversation list
   - Click the same conversation again
   - ✅ Previously selected rating is still selected
   - ✅ Data persisted correctly

### Test Tags

1. **Add Tag**
   - Type "follow-up" in tag input
   - Click "Add" or press Enter
   - ✅ Tag appears in list
   - ✅ Save status shows "Saving..." → "Saved!"

2. **Add Multiple Tags**
   - Add "escalate"
   - Add "training-needed"
   - ✅ All 3 tags visible
   - ✅ Each tag has an × button

3. **Remove Tag**
   - Click × on "follow-up" tag
   - ✅ Tag removed
   - ✅ Other tags remain

4. **Navigate Away and Back**
   - Go back to conversation list
   - Open same conversation
   - ✅ Tags persisted correctly

### Test Notes (with new Save button!)

1. **Type Notes**
   - Type some notes in the textarea
   - ✅ Text appears as you type
   - ✅ NO auto-save happening (no timeout errors!)
   - ✅ "Save Notes" button visible

2. **Save Notes**
   - Click "Save Notes" button
   - ✅ Button shows "Saving..."
   - ✅ Save status shows "Saving..." → "Saved!"
   - ✅ Button returns to "Save Notes"

3. **Edit Notes**
   - Add more text
   - Click "Save Notes" again
   - ✅ Saves successfully

4. **Navigate Away and Back**
   - Go back to conversation list
   - Open same conversation
   - ✅ Notes loaded correctly
   - ✅ Previous notes visible

### Test Bulk Actions

1. **Select Multiple Conversations**
   - Check checkbox on 3 conversations
   - ✅ Bulk Actions Bar appears at bottom
   - ✅ Shows "3 conversations selected"

2. **Bulk Set Rating**
   - Click "Set Rating" dropdown
   - Select "Good"
   - ✅ Confirmation prompt appears
   - ✅ Bulk action completes
   - ✅ Success message shows
   - ✅ Selections clear

3. **Bulk Add Tags**
   - Select 2 different conversations
   - Click "Add Tags" dropdown
   - Type "bulk-test" and add
   - ✅ Bulk action completes
   - ✅ Tag added to all selected

4. **Clear Selection**
   - Click "Clear Selection"
   - ✅ All checkboxes unchecked
   - ✅ Bulk Actions Bar disappears

---

## 3. Performance Testing

### Conversation List Load Time
- **Target:** <5 seconds for first page
- **Actual:** _____ seconds
- ✅ Pass / ❌ Fail

### Conversation Detail Load Time
- **Small (10-50 msgs):** <1 second target
- **Medium (50-200 msgs):** <3 seconds target
- ✅ Pass / ❌ Fail

### Page Navigation
- **First page load:** 4-6 seconds (COUNT + LIST query)
- **Subsequent pages:** 2-3 seconds (cached COUNT)
- ✅ Pass / ❌ Fail

### QA Action Save Time
- **Rating save:** <500ms target
- **Tag save:** <500ms target
- **Notes save:** <1 second target
- ✅ Pass / ❌ Fail

---

## 4. Error Handling

### Backend Down
1. Stop backend (`Ctrl+C`)
2. Try to load frontend
3. ✅ Error message displays
4. ✅ "Unable to connect to server" or similar

### Invalid Conversation ID
1. Navigate to `http://localhost:5173/conversation/invalid-id`
2. ✅ Error message displays
3. ✅ "Back to Explorer" button works

### Network Timeout
1. Open a conversation with many messages (200+)
2. ✅ Loads within 5 seconds (due to 200 message limit)
3. ✅ No timeout errors

### Save Failures
1. If notes save fails (simulated):
2. ✅ "Save failed" error message shows (red)
3. ✅ User can retry by clicking "Save Notes" again

---

## 5. Data Persistence

### Ratings Persist
- Set rating → Navigate away → Come back
- ✅ Rating still selected

### Tags Persist
- Add tags → Navigate away → Come back
- ✅ Tags still there

### Notes Persist
- Save notes → Navigate away → Come back
- ✅ Notes still there

### Bulk Actions Persist
- Bulk set rating on 5 conversations
- Open each individually
- ✅ All have the correct rating

---

## 6. UI/UX Testing

### Responsiveness
- ✅ Desktop (1920x1080) looks good
- ✅ Laptop (1366x768) looks good
- ✅ Tablet (768px) - sidebar collapses?
- ✅ Mobile (375px) - stacks vertically?

### Visual Feedback
- ✅ Buttons have hover states
- ✅ Selected rating is visually distinct
- ✅ Save status is clear and visible
- ✅ Loading states show spinners
- ✅ Errors are displayed in red

### Accessibility
- ✅ Tab navigation works
- ✅ Enter key works for inputs
- ✅ Color contrast is good
- ✅ Focus states are visible

---

## 7. Edge Cases

### Empty States
- ✅ No conversations found (search with no results)
- ✅ No messages in conversation
- ✅ No tags added yet
- ✅ No notes written yet

### Boundaries
- ✅ Very long notes (1000+ characters)
- ✅ Many tags (10+ tags)
- ✅ Conversation with 200 messages (hits limit)
- ✅ Page 1 with only 10 conversations (<50)

### Special Characters
- ✅ Notes with emoji
- ✅ Tags with spaces
- ✅ Search with special chars (e.g., "test&filter")

---

## 8. Known Limitations

### Message Limit
- Only first 200 messages loaded per conversation
- This is by design for performance
- For conversations with 200+ messages, user sees first 200 only

### Redshift Slow Queries
- First page load can be 5-10 seconds
- This is due to Redshift being a data warehouse
- Connection timeout increased to 120s to accommodate

### No Real-time Updates
- If another user updates a conversation, changes won't appear until refresh
- React Query cache is 5 minutes by default

---

## Regression Testing Checklist

After any code changes, test these critical paths:

- [ ] Backend starts without errors
- [ ] Frontend loads conversation list
- [ ] Can open a conversation
- [ ] Can set a rating and it persists
- [ ] Can add tags and they persist
- [ ] Can save notes with "Save Notes" button
- [ ] Bulk actions work for 3+ conversations
- [ ] Pagination works
- [ ] Filters work
- [ ] Search works

---

## Troubleshooting

### Backend won't start
```bash
# Check if .env exists
ls backend/.env

# Check if port 5000 is in use
lsof -i :5000

# View full error logs
cd backend && npm run dev
```

### Frontend can't connect
```bash
# Check backend is running
curl http://localhost:5000/health

# Check frontend is using correct URL
grep VITE_API_URL frontend/.env
```

### Slow performance
- Check Redshift cluster status
- Review backend terminal for timeout errors
- Consider adding more specific filters to reduce data

---

**Last Updated:** Jan 19, 2026
