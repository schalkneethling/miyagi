export default {
	engine: "drupal",
	drupal: {
		libraries: "mytheme.libraries.yml",
		ignorePrefixes: ["core", "drupal"],
		mapping: {
			"element-info-message": "elements/info-message",
			"element-alert-box": "elements/alert-box",
			"element-button": "elements/button",
			"element-card": "elements/card",
		},
	},
};
