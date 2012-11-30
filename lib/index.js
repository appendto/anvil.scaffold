var Handlebars = require('handlebars');
var prompt = require('prompt');
var shell = require('shelljs');
require('colors');

module.exports = function (_, anvil) {
	var exit = function () {
		// Kill the current process, effectively stopping
		// any other plugins from running
		process.exit(0);
	};

	var commands = _.reduce(['scaffold', 'generate', 'gen'], function (acc, value) {
		acc.push([ value + ' [command]', 'generate files and directories for specialized resources' ]);
		return acc;
	}, []);

	var plugin = anvil.plugin({
		name: 'anvil.scaffold',
		activity: 'scaffold',
		doScaffold: false,
		scaffold: null,
		viewContext: {},
		commander: commands,
		configure: function (config, command, done) {
			// Normalize the command from any of its aliases
			var action = command.scaffold || command.generate || command.gen;

			// Continue if the scaffold option is not used on the command line
			if (!action) {
				done(this.doScaffold);
			}

			this.doScaffold = true;

			// Force scaffolding to run before any other plugin,
			// allowing any plugin to generate a scaffold
			anvil.config.activityOrder.unshift('scaffold');

			// Expose a static method on anvil for defining scaffolds
			anvil.scaffold = function (format) {
				// Instead of tracking all registered scaffolds,
				// only capture the scaffold that matches the name
				// of the scaffolding command
				if (format.type !== action) {
					return;
				}

				plugin.scaffold = format;
			};
		
			done();
		},
		walkDirectories: function (format) {
			// Recursively walk over the current format,
			// generating directories where the value is an
			// object or files when the value is a string
			var model = this.viewContext;

			_.each(format, function (value, key) {
				// Allow using template view data in the key as well,
				// which enables templated directory and file names
				var template = Handlebars.compile(key);
				var itemName = template(model);

				if (typeof value === 'object') {
					console.log(('Creating directory: ' + itemName).magenta);
					shell.mkdir('-p', itemName);
					shell.cd(itemName);

					// Generate any nested directories within the current one
					plugin.walkDirectories(value);

					// Once complete with the current directory tree,
					// return to the previous directory
					shell.cd('..');
				} else {
					plugin.writeFile(itemName, value, model);
				}
			});
		},
		writeFile: function (filename, source, model) {
			// Generate a new file in the current directory by passing
			// a string source through a Handlebars template, using the
			// current viewContext data as the template's model
			var template = Handlebars.compile(source);
			var content = template(model);

			// Write the post-processed file to disk
			console.log(('Creating file: ' + filename).magenta);
			content.to(filename);
		},
		run: function (done) {
			if (!this.doScaffold) {
				done();
			}

			var scaffold = this.scaffold;

			// At the bare minimum, store the scaffold's type for template consumption
			_.extend(this.viewContext, {
				type: scaffold.type
			});

			// This scaffold does not require any further user input.
			// Go ahead and generate the file structure.
			if (!scaffold.prompt) {
				this.walkDirectories(scaffold.output);
				exit();
			}

			// Prompt the user for information needed from the scaffold
			prompt.message = '';
			prompt.delimiter = '';

			prompt.start();

			// Automatically extend the view data with any input the user provides at the command prompt
			prompt.addProperties(this.viewContext, scaffold.prompt, function (err) {
				if (err) {
					console.log('\nAn error occurred while trying to fetch user input:'.red);
					console.log(err);
					exit();
				}

				// Generate the file structure now that the view data has
				// been further populated by the user
				plugin.walkDirectories(scaffold.output);
				exit();
			});
		}
	});

	return plugin;
};