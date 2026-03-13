import cv2
import sys
import json
import base64
import numpy as np

def optimize_id():
    try:
        # Read from stdin to avoid CLI argument length limits
        input_b64 = sys.stdin.read().strip()
        
        if not input_b64:
            return {"success": False, "error": "No input provided to stdin"}

        if ',' in input_b64:
            input_b64 = input_b64.split(',')[1]
            
        img_data = base64.b64decode(input_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "error": "Could not decode image"}

        # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # Labs color space is best for enhancing text contrast while preserving color
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        # 2. Subtle Sharpening (Unsharp Mask)
        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
        
        # Encode back to base64
        _, buffer = cv2.imencode('.jpg', sharpened, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        enhanced_b64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "success": True, 
            "enhanced_image": enhanced_b64,
            "metrics": {
                "original_shape": img.shape[:2],
                "applied": ["CLAHE", "UnsharpMask"]
            }
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = optimize_id()
    print(json.dumps(result))
