export const fixturePng = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
	),
	(char) => char.charCodeAt(0),
);

export const fixtureJpeg = Uint8Array.from(
	atob(
		"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z",
	),
	(char) => char.charCodeAt(0),
);

export function createFixtureGlb(): Uint8Array {
	const json = JSON.stringify({
		asset: { version: "2.0", generator: "glithar-fixture" },
		scene: 0,
		scenes: [{ nodes: [0] }],
		nodes: [{ mesh: 0, name: "Glithar fixture triangle" }],
		meshes: [
			{
				primitives: [
					{
						attributes: { POSITION: 0 },
						indices: 1,
						material: 0,
					},
				],
			},
		],
		materials: [
			{
				pbrMetallicRoughness: {
					baseColorFactor: [0, 0.4, 0.8, 1],
					metallicFactor: 0.2,
					roughnessFactor: 0.7,
				},
			},
		],
		buffers: [{ byteLength: 44 }],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
			{ buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 },
		],
		accessors: [
			{
				bufferView: 0,
				componentType: 5126,
				count: 3,
				type: "VEC3",
				min: [0, 0, 0],
				max: [1, 1, 0],
			},
			{
				bufferView: 1,
				componentType: 5123,
				count: 3,
				type: "SCALAR",
			},
		],
	});
	const jsonBytes = paddedBytes(new TextEncoder().encode(json), 0x20);

	const binary = new Uint8Array(44);
	const floats = new Float32Array(binary.buffer, 0, 9);
	floats.set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
	const indices = new Uint16Array(binary.buffer, 36, 3);
	indices.set([0, 1, 2]);

	const totalLength = 12 + 8 + jsonBytes.byteLength + 8 + binary.byteLength;
	const glb = new Uint8Array(totalLength);
	const view = new DataView(glb.buffer);
	view.setUint32(0, 0x46546c67, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, totalLength, true);
	view.setUint32(12, jsonBytes.byteLength, true);
	view.setUint32(16, 0x4e4f534a, true);
	glb.set(jsonBytes, 20);
	const binaryHeader = 20 + jsonBytes.byteLength;
	view.setUint32(binaryHeader, binary.byteLength, true);
	view.setUint32(binaryHeader + 4, 0x004e4942, true);
	glb.set(binary, binaryHeader + 8);
	return glb;
}

export function fixtureAssetForKey(
	key: string,
): { body: Uint8Array; contentType: string } | null {
	if (key.endsWith("production.json")) {
		const slug = key.split("/").at(-2) || "fixture";
		const body = new TextEncoder().encode(
			JSON.stringify(
				{
					slug,
					provider: "fixture",
					current_status: "published",
					assets: {
						image_url: `/assets/interventions/${slug}/image.png`,
						raw_model_url: `/assets/interventions/${slug}/model.raw.glb`,
						optimized_model_url: `/assets/interventions/${slug}/model.optimized.glb`,
						thumbnail_url: `/assets/interventions/${slug}/thumbnail.jpg`,
					},
				},
				null,
				2,
			),
		);
		return { body, contentType: "application/json; charset=utf-8" };
	}
	if (key.endsWith(".png")) {
		return { body: fixturePng, contentType: "image/png" };
	}
	if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
		return { body: fixtureJpeg, contentType: "image/jpeg" };
	}
	if (key.endsWith(".glb") || key.endsWith(".gltf")) {
		return { body: createFixtureGlb(), contentType: "model/gltf-binary" };
	}
	return null;
}

function paddedBytes(bytes: Uint8Array, padByte: number): Uint8Array {
	const length = Math.ceil(bytes.byteLength / 4) * 4;
	const padded = new Uint8Array(length);
	padded.fill(padByte);
	padded.set(bytes);
	return padded;
}
