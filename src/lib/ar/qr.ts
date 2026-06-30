import QRCode from "qrcode";

export async function qrSvg(value: string): Promise<string> {
	return QRCode.toString(value, {
		type: "svg",
		errorCorrectionLevel: "M",
		margin: 1,
		color: {
			dark: "#000000",
			light: "#ffffff",
		},
	});
}

export async function qrPng(value: string): Promise<Uint8Array> {
	const buffer = await QRCode.toBuffer(value, {
		type: "png",
		errorCorrectionLevel: "M",
		margin: 1,
		width: 1024,
		color: {
			dark: "#000000",
			light: "#ffffff",
		},
	});
	return new Uint8Array(buffer);
}
