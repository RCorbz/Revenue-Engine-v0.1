import qrcode
import json
import os

def create_test_barcode():
    # Mock AAMVA data
    data = "@\n\x1e\rANSI 636001080002DL00410288ZS03120001DLDAQ12345678\nDCSDOE\nDACJOHN\nDBB19850101\nDBA20300101\n"
    
    # We'll create a QR code as a placeholder test since creating a PDF417 
    # might require more specialized libs, but pyzbar supports both.
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    path = "mock data for testing/test_barcode.png"
    img.save(path)
    print(f"Test barcode saved to {path}")
    return path

if __name__ == "__main__":
    create_test_barcode()
