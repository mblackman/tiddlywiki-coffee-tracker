/*\
title: $:/plugins/mblackman/coffee-tracker/filters/freshness.js
type: application/javascript
module-type: filteroperator

Filter operator for calculating days since roast date
\*/
(function() {
  'use strict';

  function parseRoastDays(roastDateStr) {
    if (!roastDateStr) return null;
    var trimmed = String(roastDateStr).trim();
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    var roastUtc;
    if (parts) {
      roastUtc = Date.UTC(
        parseInt(parts[1], 10),
        parseInt(parts[2], 10) - 1,
        parseInt(parts[3], 10),
      );
    } else {
      var parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;
      roastUtc = Date.UTC(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
      );
    }
    if (isNaN(roastUtc)) return null;
    var now = new Date();
    var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var diffDays = Math.floor((todayUtc - roastUtc) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /*
  Export our filter operator.
  Accepts either tiddler titles (reads field named by operand, defaulting to 'roast-date')
  or direct date strings if the input is not a tiddler in the wiki.
  */
  exports['days-since-roast'] = function(source, operator) {
    var results = [];

    source(function(tiddler, title) {
      var roastDate = '';
      if (tiddler) {
        var roastDateField = operator.operand || 'roast-date';
        roastDate = tiddler.getFieldString(roastDateField);
      } else if (title) {
        roastDate = title;
      }

      var diffDays = parseRoastDays(roastDate);
      if (diffDays !== null) {
        results.push(diffDays.toString());
      }
    });

    return results;
  };

  function getBagStats(wiki, bagTiddler, bagTitle) {
    var weightStr = bagTiddler ? bagTiddler.getFieldString('weight') : '';
    var initialWeight = parseFloat(String(weightStr).replace(/[^0-9.]/g, ''));
    var hasWeight = !isNaN(initialWeight) && initialWeight > 0;

    var allBrews = wiki.getTiddlersWithTag('BrewLog');
    var usedGrams = 0;
    var brewCount = 0;

    for (var i = 0; i < allBrews.length; i++) {
      var brew = wiki.getTiddler(allBrews[i]);
      if (brew && brew.fields['coffee-bag-instance'] === bagTitle) {
        brewCount++;
        var dose = parseFloat(brew.getFieldString('dose'));
        if (!isNaN(dose) && dose > 0) {
          usedGrams += dose;
        }
      }
    }

    var remainingGrams = hasWeight
      ? Math.max(0, Math.round(initialWeight - usedGrams))
      : null;

    return {
      hasWeight: hasWeight,
      initialWeight: initialWeight,
      usedGrams: Math.round(usedGrams),
      remainingGrams: remainingGrams,
      brewCount: brewCount,
    };
  }

  exports['remaining-bag-weight'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      if (tiddler) {
        var stats = getBagStats(wiki, tiddler, title);
        if (stats.hasWeight && stats.remainingGrams !== null) {
          results.push(stats.remainingGrams.toString());
        }
      }
    });

    return results;
  };

  exports['bag-running-low'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var thresholdGrams = parseFloat(operator.operand) || 45;

    source(function(tiddler, title) {
      if (tiddler) {
        var stats = getBagStats(wiki, tiddler, title);
        if (stats.hasWeight) {
          if (stats.remainingGrams <= thresholdGrams) {
            results.push(title);
          }
        } else if (stats.brewCount >= 10) {
          results.push(title);
        }
      }
    });

    return results;
  };
})();
