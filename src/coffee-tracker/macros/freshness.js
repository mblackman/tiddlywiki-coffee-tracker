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
      var trimmed = String(roastDate).trim();
      var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      var roastUtc;

      if (parts) {
        roastUtc = Date.UTC(
          parseInt(parts[1], 10),
          parseInt(parts[2], 10) - 1,
          parseInt(parts[3], 10),
        );
      } else {
        var roast = new Date(trimmed);
        if (isNaN(roast.getTime())) {
          return '';
        }
        roastUtc = Date.UTC(
          roast.getFullYear(),
          roast.getMonth(),
          roast.getDate(),
        );
      }

      if (isNaN(roastUtc)) {
        return '';
      }

      var today = new Date();
      var todayUtc = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      // Calculate difference in calendar days (clamped to >= 0)
      var diffDays = Math.floor((todayUtc - roastUtc) / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays).toString();
    } catch (e) {
      return '';
    }
  };
})();
