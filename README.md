# anvil.scaffold

`anvil.scaffold` is a generic scaffolding utility for the [anvil.js](https://github.com/arobson/anvil.js) Node.js build engine. `anvil.scaffold` exposes a method that allows other plugins to configure scaffold definitions using a conventional format to generate templated files and directories.

--

## Installation

In order to use `anvil.scaffold` you must first have Anvil installed, then run the following from the command line:

```sh
anvil install anvil.scaffold
```

In order for your plugin or task to consume Anvil's scaffolding, it must also be a required plugin within your project's `package.json`:

```js
{
	"name": "anvil.exampleplugin",
	"version": "0.1.0",
	"description": "Your sample plugin",
	"main": "lib/index.js",
	"requiredPlugins": [
		"anvil.scaffold"
	]
}
```

## Usage

### Quick Look

Once `anvil.scaffold` is installed, you can start consuming it with your own Anvil plugins. As a simple demo, here is an anvil plugin that will define how additional Anvil plugins can be scaffolded:

```javascript
module.exports = function (_, anvil) {
	var content = readFileAsString('./plugin.template.js');

	return anvil.plugin({
		name: 'anvil.scaffold.plugin',
		configure: function (config, command, done) {
			anvil.scaffold({
				type: 'plugin',
				prompt: [{
					name: 'name',
					description: 'Please choose a name for this plugin:',
					required: true
				}],
				output: {
					lib: {},
					src: {
						'index.js': content
					}
				}
			});

			done();
		}
	});
};
```

The contents of the `plugin.template.js` is:

```js
module.exports = function (_, anvil) {
	return anvil.plugin({
		name: '{{name}}',
		configure: function (config, command, done) {
			done();
		},
		run: function (done) {
			done()
		}
	});
};
```

Once this scaffold is executed, it will output `lib` and `src` directories and an `index.js` file with `src` that has the name populated from metadata supplied by the user at the command line.

### API

```javascript
anvil.scaffold( definition );
```

Having `anvil.scaffold` installed exposes a new method called `anvil.scaffold` which plugins can use to create scaffold definitions. These scaffold definitions must currently exist within a plugin's `configure` method. `anvil.scaffold` accepts a single object for defining the scaffold:

```javascript
module.exports = function (_, anvil) {
	return anvil.plugin({
		name: 'anvil.scaffold.plugin',
		configure: function (config, command, done) {
			anvil.scaffold({
				...
			});

			done();
		}
	});
};
```

#### Properties

The following is a list of acceptable properties that can be set on the scaffold definition object.

--

`type`

The unique identifier to reference this scaffold. This type will be used on the command line to specify which scaffold to invoke.

_Examples_

`type: 'plugin'`

`type: 'jquery-plugin'`

`type: 'backbone:model'`

--

`prompt`

This is a value used to solicit additional metadata from the user. This metadata will be passed as a model to all files and directories for templating. `prompt` accepts input in any schema defined by the [prompt](https://github.com/flatiron/prompt#usage) package.

_Examples_

```javascript
// will ask for "name" at command line,
// creating a "name" property for all template models
prompt: ['name'] 
```

```javascript
// will require description at command line,
// creating a "name" property for all template models
prompt: [{
	name: 'name',
	description: 'Please choose a name for this plugin:',
	required: true
}]
```

```javascript
// will require 2 descriptions at command line,
// creating a "username" and "password" property for all template models,
// hiding the password entered
prompt: [{
	name: 'username',
	description: 'Enter your username:',
	required: true
}, {
	name: 'password',
	description: 'Enter your password:',
	required: true,
	hidden: true
}]
```

Please see [prompt](https://github.com/flatiron/prompt#usage) for more detailed usage of the `prompt` API.

--

`output`

**Take note that at this time, using output from scaffolding will overwrite any files and directories specified. Please use caution when creating your output format.**

Define the structure of directories and files to write to the file system. This accepts a map of properties to file and directory names and contents. If a property is an object, a directory will be generated. If a property is a string, a file will be generated. Take the following example:

```javascript
output: {
	destination: {}
}
```

Since `destination` is an object, a directory with that name will be created. It should also be possible to generate directories using a more complex path style:

```javascript
output: {
	'src/scripts/external': {}
}
```

This output would create an `external` directory within `src/scripts`, additionally generating those directories as well if they did not already exist. Since the value of the object of this destination is empty, the directory itself will also remain empty. Nesting any structures within the object will create a nested directory tree:

```javascript
output: {
	src: {
		scripts: {
			external: {}
		}
	}
}
```

In order to generate files, the property's value must be a string. Continuing with our previous example:

```javascript
output: {
	src: {
		scripts: {
			external: {
				'file.js': '(function () {})();'
			}
		}
	}
}
```

This would output the same directory structure as before, except now a `file.js` will be created in the `external` directory. The contents to use for the file are the string value of the property, or `(function () {})();`. You may also choose to store the content of the file in another file and read it as a string, possibly making maintenance of these files easier.

In addition, all keys and string values are passed through Handlebars for templating. This allows you to dynamically generate file contents or even file and directory names themselves:

```javascript
output: {
	src: {
		scripts: {
			'{{dirType}}': {
				'{{scriptName}}.js': '(function ({{lib}}) {})({{lib}});'
			}
		}
	}
}
```

The data which is used as a model for the templates comes from data optionally supplied in the scaffold or from a user's inputs at the command prompts. This data is automatically merged together for you. The only property passed to `anvil.scaffold` by default is the `type` property.

--

`data`

An object containing additional data to pass to scaffold templates (e.g. file contents and file and directory names). This data will be automatically merged with other data including properties provided by `anvil.scaffold` and from user input prompt responses. Please note that any properties provided in `data` that match names provided in `prompt` will have their values overwritten by user input.

_Examples_

```javascript
data: {
	author: 'appendTo',
	status: 'l33t'
},
// Now usable within scaffold templates:
output: {
	scripts: {
		'{{author}}.js': 'console.log("This app is {{status}}");'
	}
}
```

### Command line

Invoking a scaffold from the command line:

```sh
anvil scaffold <type>
```

where `type` is the name of a scaffold definition. `scaffold` is also aliased to `generate` or `gen`:

```sh
anvil generate backbone:model
anvil gen jquery-plugin
```

As an example, if you wanted to scaffold a plugin using our previous definition:

```sh
anvil scaffold plugin
```

Since there was prompt information defined in the scaffold, this would be the expected output to the command line:

```sh
$ anvil scaffold plugin
checking for 0 build dependencies 
loading plugins
loading tasks from /Users/me/git/some-plugin/tasks
plugin configuration complete
starting activity, scaffold
	running plugin: 'anvil.scaffold'
Please choose a name for this plugin: awesome
Creating directory: lib
Creating directory: src
Creating file: index.js
```

