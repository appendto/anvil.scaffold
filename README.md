# anvil.scaffold

`anvil.scaffold` is a generic scaffolding utility for the [anvil.js](https://github.com/arobson/anvil.js) Node.js build engine. `anvil.scaffold` exposes a method that allows other plugins to configure scaffold definitions using a conventional format to generate templated files and directories.

---

## Installation

In order to use `anvil.scaffold` you must first have Anvil installed, then run the following from the command line:

```sh
anvil install anvil.scaffold
```

In order for your plugin or task to consume anvil's scaffolding, it must also be a required plugin within your project's `package.json`:

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

---

## Usage

---

### Quick Look


Once `anvil.scaffold` is installed, you can start consuming it with your own anvil plugins. As a simple demo, here is an anvil plugin that will define how additional anvil plugins can be scaffolded:

```javascript
module.exports = function (_, anvil) {
	var content = readFile('./plugin.template.js');

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

```

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

The following is a list of acceptable properties that can be set on the scaffold definition object:

---

`type`

The unique identifier to reference this scaffold. This type will be used on the command line to specify which scaffold to invoke.

_Examples_

`type: 'plugin'`

`type: 'jquery-plugin`

`type: 'backbone:model`

---

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

---

`output`

Define the structure of directories and files to write to the file system. `output` accepts a single object/map to define the generated structure. Object keys map to the name of the generated file or directory. If the value provided for the key is an object, a directory will be created with the key name. If the value provided for the key is a string, a file will be created, using the string value as the content for the file and the key as the file name.

You can also nest additional files and directories within objects, providing the ability to create somewhat complex scaffolding structures.

In addition, all keys and string values are Handlebars templates and will be given all plugin metadata (e.g. plugin type, user provided input, etc.) as a model to the template. This allows for dynamic generation of directory names, file names, as well as file content.

_Examples_

```javascript
// Generate a lib directory and a src directory with a single
// index.js file which contains a type equal to the type of scaffolding running
output: {
	lib: {},
	src: {
		"index.js": "module.{{type}} = function () {};"
	}
}
```

```javascript
// Generate a single HTML file with its name based on a
// name parameter supplied by the user
output: {
	"{{name}}.html": "<!doctype html><html>...</html>"
}
```

### Command line

Invoking a scaffold from the command line:

```sh
anvil scaffold <type>
```

where `type` is the name of a scaffold definition. For example, if one wanted to scaffold a plugin using the previous definition:

```sh
anvil scaffold plugin
```

More coming...