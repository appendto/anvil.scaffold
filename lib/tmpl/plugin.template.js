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
