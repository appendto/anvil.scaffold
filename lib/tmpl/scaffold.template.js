module.exports = function (_, anvil) {
	return anvil.plugin({
		name: '{{name}}',
		configure: function (config, command, done) {
			var source = path.dirname(__filename);
			source = path.resolve(source, "./tmpl/plugin.template.js");

			anvil.fs.read(source, function (content) {
				anvil.scaffold({
					type: 'plugin',
					description: 'Example scaffold plugin that generates a plugin',
					prompt: [{
						name: 'name',
						description: 'Please choose a name for this plugin:',
						required: true
					}],
					output: {
						lib: {},
						src: {
							'index.js': content
							'tmpl': {
								'plugin.template.js': 'Plugin content goes here!'
							}
						}
					}
				});

				done();
			});
		}
	});
};
