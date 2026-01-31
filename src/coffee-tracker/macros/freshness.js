/*\
title: $:/plugins/mblackman/coffee-tracker/macros/freshness.js
type: application/javascript
module-type: macro

Macro for calculating days since roast date
\*/
(function() {
  /*
Calculate days since a given date
  */
  exports.name = 'days-since-roast';

  exports.params = [
    { name: 'roastDate' },
  ];

  exports.run = function(roastDate) {
    if (!roastDate) return '';

    try {
      const roast = new Date(roastDate);
      const today = new Date();

      // Check for invalid date
      if (isNaN(roast.getTime())) {
        return '';
      }

      // Calculate difference in days
      const diffTime = Math.abs(today - roast);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays.toString();
    } catch (e) {
      return '';
    }
  };
})();
