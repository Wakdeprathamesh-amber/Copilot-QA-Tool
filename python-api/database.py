import yaml
import redshift_connector
from typing import Optional, Dict, List, Any

class DatabaseConnect:
    def __init__(self, config_path='config.yaml'):
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
            # Redshift config is at root level, not nested under 'database'
            self.config = {
                'NAME': config['NAME'],
                'USER': config['USER'],
                'PASS': config['PASS'],
                'HOST': config['HOST'],
                'PORT': config['PORT']
            }
        self.connection = None
    
    def connect_database(self):
        """Establish database connection"""
        if self.connection is None or (hasattr(self.connection, 'is_closed') and self.connection.is_closed()):
            self.connection = redshift_connector.connect(
                database=self.config["NAME"],
                user=self.config["USER"],
                password=self.config["PASS"],
                host=self.config["HOST"],
                port=self.config["PORT"]
            )
        return self.connection
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dicts"""
        conn = self.connect_database()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, params)
            if cursor.description:  # SELECT query
                columns = [desc[0] for desc in cursor.description]
                results = cursor.fetchall()
                return [dict(zip(columns, row)) for row in results]
            else:  # INSERT/UPDATE/DELETE
                conn.commit()
                return []
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def close(self):
        """Close database connection"""
        if self.connection and hasattr(self.connection, 'close'):
            self.connection.close()
