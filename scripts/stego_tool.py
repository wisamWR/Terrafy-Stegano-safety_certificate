import sys
import os
import json
from stegano import lsb

def embed_data(image_path, output_path, secret_message):
    try:
        if not os.path.exists(image_path):
            print(json.dumps({"success": False, "error": "Input file not found"}))
            return

        # Hide message
        secret = lsb.hide(image_path, secret_message)
        secret.save(output_path)
        
        print(json.dumps({"success": True, "output_path": output_path}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

def reveal_data(image_path):
    try:
        if not os.path.exists(image_path):
            print(json.dumps({"success": False, "error": "File not found"}))
            return

        clear_message = lsb.reveal(image_path)
        print(json.dumps({"success": True, "message": clear_message}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python stego_tool.py <embed|reveal> [args]"}));
        sys.exit(1)

    action = sys.argv[1]

    if action == "embed":
        if len(sys.argv) < 5:
             print(json.dumps({"success": False, "error": "Usage: embed <input> <output> <message>"}));
        else:
            embed_data(sys.argv[2], sys.argv[3], sys.argv[4])
    
    elif action == "reveal":
        if len(sys.argv) < 3:
             print(json.dumps({"success": False, "error": "Usage: reveal <input>"}));
        else:
            reveal_data(sys.argv[2])
    
    else:
        print(json.dumps({"success": False, "error": "Unknown command"}))
