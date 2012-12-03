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