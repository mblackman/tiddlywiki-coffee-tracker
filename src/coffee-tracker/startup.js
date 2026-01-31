/*\
title: $:/plugins/mblackman/coffee-tracker/startup.js
type: application/javascript
module-type: startup

Coffee Tracker plugin startup initialization
\*/
(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  exports.name = 'coffee-tracker-init';
  exports.platforms = ['browser'];
  exports.after = ['startup'];
  exports.synchronous = true;

  exports.startup = function() {
    // Initialize default configuration values if not already set
    var configDefaults = {
      '$:/plugins/mblackman/coffee-tracker/config/freshness/peak-start': '7',
      '$:/plugins/mblackman/coffee-tracker/config/freshness/peak-end': '21',
      '$:/plugins/mblackman/coffee-tracker/config/freshness/optimal-end': '60',
    };

    // Set defaults for any missing config values
    Object.keys(configDefaults).forEach(function(title) {
      if (!$tw.wiki.getTiddler(title)) {
        $tw.wiki.addTiddler(
          new $tw.Tiddler({
            title: title,
            text: configDefaults[title],
          }),
        );
      }
    });

    // Log initialization (only in development)
    if ($tw.wiki.getTiddlerText('$:/config/coffee-tracker/debug') === 'yes') {
      console.log('Coffee Tracker plugin initialized');
    }
  };
})();
