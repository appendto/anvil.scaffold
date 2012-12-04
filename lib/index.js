var prompt = require( "prompt" );
var shell = require( "shelljs" );
var lodash = require( "lodash" );
var p = require( "path" );

module.exports = function ( _, anvil, testing ) {
	var Handlebars = require( "handlebars" );
	
	// This is a lightweight wrapper around the config
	// formats and exposes a few default methods
	function Scaffold( format ) {
		// This protects private methods and variables
		// from being overwritten
		_.each( _.keys( format ), function ( key ) {
			if ( key.substr( 0, 1 ) === "_" ) {
				delete format[ key ];
			}
		});
	
		// Store everything else directly on the scaffold
		_.extend( this, format );
	
		// At the bare minimum, store the scaffold's type for template consumption
		this._viewContext = _.extend( {}, format.data, { type: format.type } );
	}
	
	_.extend( Scaffold.prototype, {
		render: function ( data ) {
			var template = Handlebars.compile( data.template );
			return template( data.data );
		},
	
		processData: function ( data ) {
			return data;
		},
	
		_processData: function () {
			this._viewContext = this.processData( this._viewContext );
		}
	});

	var exit = function () {
		// TEMPORARY: Will be removed when command
		// support is added to Anvil
		if ( testing ) {
			testing();
			return;
		}
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

			anvil.scaffold.file = function ( filename ) {
				console.log(filename);
				console.log(process.cwd());

				return function ( viewModel, done ) {
					anvil.fs.read( filename, done );
				};
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

		buildScaffold: function ( scaffold, scaffoldDone ) {

			// Handles converting callback functions to either
			// an object or string for further use
			function parse( content, path, done ) {
				if ( typeof content === "function" ) {
					// Pass off control to the callback
					content.call( scaffold, lodash.clone( scaffold._viewContext, true ), function ( data ) {
						write( data, path, done );
					} );
					return;
				}

				write( content, path, done );
			}

			function write( content, path, done ) {
				var mapped = {}, realPath;

				if ( typeof content === "object" ) {
					// This is a directory, add the slash
					// but only if its not top level
					if ( path ) {
						path += "/";
					}

					// Loop over each item in this object
					// and prepare to process it in the mapped object
					_.each( content, function ( value, name ) {

						// Process the name through the render
						// method if present
						if ( scaffold.render ) {
							name = scaffold.render.call( scaffold, {
								mode: "name",
								filename: null,
								template: name,
								data: lodash.clone( scaffold._viewContext, true )
							});
						}

						// Queue it up to run
						mapped[ name ] = function ( done ) {
							parse( value, path + name, done );
						};
					});

					// Create the directory if needed
					if ( path ) {
						realPath = anvil.fs.buildPath( path );
						anvil.fs.ensurePath( realPath, function ( err ) {
							if ( err ) {
								// No error handler yet
							}

							anvil.log.debug( "Created directory: " + path );

							// Process all sub items of this directory
							anvil.scheduler.mapped( mapped, done );
						});
					} else {
						// Process all sub items of this directory
						anvil.scheduler.mapped( mapped, done );
					}
				} else {
					if ( path === "" ) {
						anvil.log.error( "You must supply an object to `output`" );
						exit();
					}

					realPath = anvil.fs.buildPath( path );

					// Process the content through the render
					// method if present
					if ( scaffold.render ) {
						content	= scaffold.render.call( scaffold, {
							mode: "file",
							filename: p.basename( realPath ),
							fullpath: path,
							template: content,
							data: lodash.clone( scaffold._viewContext, true )
						});
					}

					anvil.fs.write( realPath, content, function ( err ) {
						if ( err ) {
							// No error handler yet
						}
						anvil.log.debug( "Created file: " + path );
						done();
					});
				}
			}

			parse( scaffold.output, "", scaffoldDone );
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
				anvil.log.warning( "This scaffold did not specify any output." );
				exit();
				return;
			}

			// This scaffold does not require any further user input.
			// Go ahead and generate the file structure.
			if ( !scaffold.prompt ) {
				scaffold._processData();
				this.buildScaffold( scaffold, function () {
					exit();
				});
				return;
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
					anvil.log.error( "\nAn error occurred while trying to fetch user input:" );
					anvil.log.error( err );
					exit();
					return;
				}

				// Generate the file structure now that the view data has
				// been further populated by the user
				scaffold._processData();
				plugin.buildScaffold( scaffold, function () {
					exit();
				});
			});
		}
	});

	return plugin;
};