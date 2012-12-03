# anvil.scaffold

`anvil.scaffold` is a generic scaffolding utility for the [anvil.js](https://github.com/arobson/anvil.js) Node.js build engine. `anvil.scaffold` exposes a method that allows other plugins to configure scaffold definitions using a conventional format to generate templated files and directories.

--

## Installation

In order to use `anvil.scaffold` you must first have Anvil installed, then run the following from the command line:

```sh
anvil install anvil.scaffold
```

In order for your plugin or task to consume Anvil's scaffolding, it must also be a required plugin within your project's `package.json`:

```javascript
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
				description: 'Creates a new anvil plugin',
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

```plain
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

`description`

A short description that will be shown on the command line when when a user runs `anvil scaffold list`

_Examples_

`description: 'Create an empty Backbone project'`

`description: 'Create a new Anvil plugin'`

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

The data which is used as a model for the templates comes from data optionally supplied in the scaffold or from a user's inputs at the command prompts. This data is automatically merged together for you. The `type` will be passed to the view template automatically.

Finally, you can supply a function for any one of the values as long as your function returns either a string (the contents of a file), or an object for a new directory level. The final merged user input and `data` from your scaffold will be passed into the method as its only argument.

This example would generate a different file based on theoretical user input:

```javascript
output: function ( data ) {
	if ( data.short ) {
		return { "short.js": fileContentsShort }
	} else {
		return { "normal.js": fileContentsNormal }
	}
}
```

You can (and should) use this to load files just when you need them instead of loading them every time your plugin is fired up:

```javascript
output: {
	"yourfile.js": function () {
		return fs.readFileSync( "./templates/yourfile.js", "utf8" );
	}
}
```

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

#### Methods

The following is a list of methods that have default functionality, but you can override to provide a greater level of control to your scaffolds:

--

`render`

All keys and values on your `output` object are passed through this method. The default `render` method looks like this:

```javascript
render: function ( data ) {
	var template = Handlebars.compile( data.template );
	return template( data.data );
}
```

The `data` argument contains relevant properties necessary for rendering a string for file output:

* `mode`: Will either be `"name"` or `"file"` based on if it's rendering a file/directory name, or the contents of a file
* `template`: The contents of either the file/directory name, or the contents of a file
* `filename`: If in `"file"` mode this will be just the name and extension of the file, otherwise `null`

To disable templating entirely, pass `false` as the value for `render`:

```javascript
render: false
```

--

`processData`

You can override this method to manipulate the data being passed to any templates right before templating occurs, e.g. right after user input has been retrieved. It receives the data as its only parameter, and only what you return will be used as the new template data.

By default it simply returns the data that is passed in.

_Example_

In this example, the user supplied name is cleaned and prepared to be used as a directory name and key:

```javascript
prompt: [{
	name: 'name',
	description: 'Please choose a name for your theme:',
	required: true
}],
processData: function ( data ) {
	data.key = data.name
	               .toLowerCase()
	               .trim()
	               .replace( /[^a-z0-9_-]/g, '-' )
	               .replace( /-+/g, '-' );
	return data;
}
```

--

### Command line

Invoking a scaffold from the command line:

```sh
anvil scaffold list
anvil scaffold <type>
```

where `type` is the name of a scaffold definition. `scaffold` is also aliased to `generate` or `gen`:

```sh
anvil generate backbone:model
anvil gen jquery-plugin
```

#### Listing Available Scaffolds:

If you wanted to list available scaffolds, and you had the plugin example from earlier ready:

```sh
anvil scaffold list
```

The expected output (after default Anvil output) would be:

```sh
Currently available scaffolds:
  * plugin               Creates a new anvil plugin
```

#### Running a Scaffold

If you wanted to scaffold a plugin, for example, using our previous definition:

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
