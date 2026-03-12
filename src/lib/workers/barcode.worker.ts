import { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library';

const reader = new MultiFormatReader();
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
hints.set(DecodeHintType.TRY_HARDER, true);
reader.setHints(hints);

self.onmessage = (e) => {
    const { imageData, width, height } = e.data;
    try {
        const source = new RGBLuminanceSource(imageData, width, height);
        const bitmap = new BinaryBitmap(new HybridBinarizer(source));
        const result = reader.decode(bitmap);
        self.postMessage({ success: true, text: result.getText() });
    } catch (err) {
        self.postMessage({ success: false });
    }
};
