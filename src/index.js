var prompt = require( "prompt" );
var shell = require( "shelljs" );
var lodash = require( "lodash" );
require( "colors" );

module.exports = function ( _, anvil ) {
	// import( "./scaffold.js" )

	var exit = function () {
		// Kill the current process, effectively stopping
		// any other plugins from running
		process.exit( 0 );
	};

	var commands = _.reduce( [ "scaffold", "generate", "gen" ], function ( acc, value ) {
		acc.push( [ value + " [command]", "generate files and directories for specialized resources" ] );
		return acc;
	}, []);

	var plugin = anvil.plugin({
		name: "anvil.scaffold",
		activity: "scaffold",
		currentAction: null,
		currentScaffold: null,
		scaffolds: {},
		commander: commands,
		configure: function ( config, command, done ) {
			// Normalize the command from any of its aliases
			var action = command.scaffold || command.generate || command.gen;

			// Expose a static method on anvil for defining scaffolds
			anvil.scaffold = function ( format ) {
				plugin.scaffolds[ format.type ] = new Scaffold( format );
			};

			// TODO: inject built-in scaffolds from external files here

			// Continue if the scaffold option is not used on the command line
			if ( !action ) {
				return done( false );
			}

			this.currentAction = action;

			// Force scaffolding to run before any other plugin,
			// allowing any plugin to generate a scaffold
			anvil.config.activityOrder.unshift( "scaffold" );
		
			done();
		},
		walkDirectories: function ( format, viewContext ) {
			// Recursively walk over the current format,
			// generating directories where the value is an
			// object or files when the value is a string
			var scaffold = this.currentScaffold;

			_.each( format, function ( value, key ) {
				// Support a value that is a function. If present
				// the result of the function should be used as the value
				if ( typeof value === "function" ) {
					value = value.call( scaffold, scaffold._viewContext );
				}

				// Allow using template view data in the key which
				// enables templated directory and file names
				var itemName = key;

				if ( scaffold.render ) {
					itemName = scaffold.render.call( scaffold, {
						mode: "name",
						filename: null,
						template: key,
						data: lodash.clone( scaffold._viewContext, true )
					});
				}

				// If value is a string, write out a file
				if ( typeof value === "string" ) {
					return plugin.writeFile( itemName, value );
				}

				console.log( ( "Creating directory: " + itemName ).magenta );
				shell.mkdir( "-p", itemName );
				shell.cd( itemName );

				// Generate any nested directories within the current one
				plugin.walkDirectories( value );

				// Once complete with the current directory tree,
				// return to the previous directory
				shell.cd( ".." );
			});
		},
		writeFile: function ( filename, source ) {
			var scaffold = this.currentScaffold;
			var content = source;

			// Generate a new file in the current directory by passing
			// a string source through a template method if present
			if ( scaffold.render ) {
				content = scaffold.render.call( scaffold, {
					type: "file",
					filename: filename,
					template: source,
					data: lodash.clone( scaffold._viewContext, true )
				});
			}
			
			// Write the post-processed file to disk
			console.log( ( "Creating file: " + filename ).magenta);
			content.to( filename );
		},

		list: function () {
			var output = [ "Currently available scaffolds:" ];

			// Find the longest type so we can line up the descriptions
			var longest = _.max( _.keys( this.scaffolds ), function ( key ) {
				return key.length;
			});

			longest = Math.max( 20, longest.length );

			var padding = ( new Array( longest + 1 ) ).join( " " );

			// Generate the descriptions
			_.each( this.scaffolds, function ( scaffold, type ) {
				var paddedType = ( type + padding ).substr( 0, longest );
				var description = scaffold.description || "No description provided";
				output.push( "  * " + paddedType + " " + description );
			});

			console.log( "\n" + output.join( "\n" ) );
			exit();
		},

		run: function ( done ) {
			if ( this.currentAction === "list" ) {
				this.list();
				return;
			}

			var scaffold = this.currentScaffold = plugin.scaffolds[ this.currentAction ];

			if ( !scaffold ) {
				return done();
			}

			if ( !scaffold.output ) {
				console.log( "This scaffold did not specify any output.".yellow );
				exit();
			}

			// This scaffold does not require any further user input.
			// Go ahead and generate the file structure.
			if ( !scaffold.prompt ) {
				scaffold._processData();
				this.walkDirectories( scaffold.output );
				exit();
			}

			// Prompt the user for information needed from the scaffold
			// Change the default style of the prompt, which looks weird
			// if you specify normal questions or descriptions
			prompt.message = "";
			prompt.delimiter = "";

			prompt.start();

			// Automatically extend the view data with any input the user provides at the command prompt
			prompt.addProperties( scaffold._viewContext, scaffold.prompt, function ( err ) {
				if ( err ) {
					console.log( "\nAn error occurred while trying to fetch user input:".red );
					console.log( err );
					exit();
				}

				// Generate the file structure now that the view data has
				// been further populated by the user
				scaffold._processData();
				plugin.walkDirectories( scaffold.output );
				exit();
			});
		}
	});

	return plugin;
};