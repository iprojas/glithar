declare module "qrcode" {
	interface QRColorOptions {
		dark?: string;
		light?: string;
	}

	interface QROptions {
		type?: "svg" | "png" | string;
		errorCorrectionLevel?: "L" | "M" | "Q" | "H";
		margin?: number;
		width?: number;
		color?: QRColorOptions;
	}

	const QRCode: {
		toString(value: string, options: QROptions): Promise<string>;
		toBuffer(value: string, options: QROptions): Promise<Uint8Array>;
	};

	export default QRCode;
}
