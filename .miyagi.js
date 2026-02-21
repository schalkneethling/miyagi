import fs from "node:fs";
import { createEnvironment, createFilesystemLoader } from "twing";

const loader = createFilesystemLoader(fs);
const twing = createEnvironment(loader);

export default {
	assets: {
		root: "tests/_setup/assets",
		shared: {
			css: ["shared.css"],
			js: [{ src: "shared.js" }],
		},
		css: ["shared.css", "global-only.css"],
		js: [{ src: "shared.js" }, { src: "global-only.js" }],
	},
	components: {
		folder: "tests/_setup/components",
	},
	docs: null,
	engine: {
		name: "twing",
		async render({ name, context, cb }) {
			try {
				return cb(null, await twing.render(name, context));
			} catch (err) {
				return cb(err.toString());
			}
		},
	},
	files: {
		templates: {
			name: "<component>",
			extension: "twig",
		},
	},
	schema: {
		options: {
			strict: false,
		},
	},
};
