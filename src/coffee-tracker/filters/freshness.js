/*\
title: $:/plugins/mblackman/coffee-tracker/filters/freshness.js
type: application/javascript
module-type: filteroperator

Filter operator for calculating days since roast date
\*/
(function() {
  'use strict';

  /*
  Export our filter operator
  */
  exports['days-since-roast'] = function(source, operator, options) {
    var results = [];

    source(function(tiddler, title) {
      if (tiddler) {
        var roastDateField = operator.operand || 'roast-date';
        var roastDate = tiddler.getFieldString(roastDateField);

        if (roastDate) {
          try {
            var roast = new Date(roastDate);
            var today = new Date();

            if (!isNaN(roast.getTime())) {
              var diffTime = Math.abs(today - roast);
              var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              // Add a property to the tiddler for use in further filters
              results.push(diffDays.toString());
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      }
    });

    return results;
  };
})();
