/*\
title: $:/plugins/mblackman/coffee-tracker/filters/freshness.js
type: application/javascript
module-type: filteroperator

Filter operators for roast age, freezer pause, bag weight depletion, cost economics, and best-brew selection
\*/
(function() {
  'use strict';

  var DAY_MS = 1000 * 60 * 60 * 24;

  function parseDateUtc(dateString) {
    if (!dateString) return null;
    var trimmed = String(dateString).trim();
    if (!trimmed) return null;
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    var utc;
    if (parts) {
      utc = Date.UTC(
        parseInt(parts[1], 10),
        parseInt(parts[2], 10) - 1,
        parseInt(parts[3], 10),
      );
    } else {
      // Avoid interpreting plain field names like 'roast-date' as dates
      if (/^[a-zA-Z_-]+$/.test(trimmed)) return null;
      var parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;
      utc = Date.UTC(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
      );
    }
    return isNaN(utc) ? null : utc;
  }

  function getTodayUtc() {
    var now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function parsePositiveNumber(string_) {
    if (!string_) return null;
    var number_ = parseFloat(String(string_).replace(/[^0-9.]/g, ''));
    return !isNaN(number_) && number_ > 0 ? number_ : null;
  }

  function parseSignedNumber(string_) {
    if (!string_) return 0;
    var number_ = parseFloat(String(string_).replace(/[^0-9.-]/g, ''));
    return !isNaN(number_) ? number_ : 0;
  }

  function computeBagRoastAge(bagTiddler, endDateUtc, roastDateField) {
    if (!bagTiddler) return null;
    var fieldName = roastDateField || 'roast-date';
    var roastUtc = parseDateUtc(bagTiddler.getFieldString(fieldName));
    if (roastUtc === null) return null;

    var targetUtc = typeof endDateUtc === 'number' ? endDateUtc : getTodayUtc();

    if (bagTiddler.hasTag('Frozen')) {
      var frozenUtc = parseDateUtc(bagTiddler.getFieldString('frozen-date'));
      if (frozenUtc !== null && frozenUtc < targetUtc) {
        targetUtc = frozenUtc;
      }
    }

    var frozenDays = Math.max(
      0,
      Math.round(parseSignedNumber(bagTiddler.getFieldString('frozen-days'))),
    );
    var diffDays = Math.floor((targetUtc - roastUtc) / DAY_MS) - frozenDays;
    return Math.max(0, diffDays);
  }

  function computeBrewRoastAge(wiki, brewTiddler) {
    if (!brewTiddler) return null;
    var brewUtc = parseDateUtc(brewTiddler.getFieldString('brew-date'));
    if (brewUtc === null) return null;

    var bagTitle = brewTiddler.getFieldString('coffee-bag-instance');
    var bagTiddler = bagTitle && wiki ? wiki.getTiddler(bagTitle) : null;
    if (bagTiddler) {
      return computeBagRoastAge(bagTiddler, brewUtc, 'roast-date');
    }

    var roastUtc = parseDateUtc(brewTiddler.getFieldString('roast-date'));
    if (roastUtc === null) return null;
    var diffDays = Math.floor((brewUtc - roastUtc) / DAY_MS);
    return Math.max(0, diffDays);
  }

  /*
  Export days-since-roast filter operator.
  - On a BrewLog tiddler (with no field operand): calculates roast age on brew-date.
  - On a CoffeeBagInstance (or any tiddler with roast-date): calculates roast age up to today
    (or up to operand if operand is a YYYY-MM-DD date), pausing while tagged 'Frozen' and subtracting 'frozen-days'.
  - On a raw date string: calculates days between that date and today (or operand date).
  */
  exports['days-since-roast'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var operand = operator.operand || '';
    var operandDateUtc = parseDateUtc(operand);

    source(function(tiddler, title) {
      var diffDays = null;

      if (tiddler) {
        if (tiddler.hasTag('BrewLog') && !operand) {
          diffDays = computeBrewRoastAge(wiki, tiddler);
        } else if (operandDateUtc !== null) {
          diffDays = computeBagRoastAge(tiddler, operandDateUtc, 'roast-date');
        } else {
          diffDays = computeBagRoastAge(
            tiddler,
            getTodayUtc(),
            operand || 'roast-date',
          );
        }
      }

      if (diffDays === null && title) {
        var roastUtc = parseDateUtc(title);
        var targetUtc = operandDateUtc !== null ? operandDateUtc : getTodayUtc();
        if (roastUtc !== null && targetUtc !== null) {
          diffDays = Math.max(0, Math.floor((targetUtc - roastUtc) / DAY_MS));
        }
      }

      if (diffDays !== null) {
        results.push(diffDays.toString());
      }
    });

    return results;
  };

  exports['brew-roast-age'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler) {
      if (tiddler) {
        var diffDays = computeBrewRoastAge(wiki, tiddler);
        if (diffDays !== null) {
          results.push(diffDays.toString());
        }
      }
    });

    return results;
  };

  function getBagStats(wiki, bagTiddler, bagTitle) {
    var weightString = bagTiddler ? bagTiddler.getFieldString('weight') : '';
    var initialWeight = parsePositiveNumber(weightString);
    var hasWeight = initialWeight !== null;

    var weightAdjustment = bagTiddler
      ? parseSignedNumber(bagTiddler.getFieldString('weight-adjustment'))
      : 0;

    var allBrews = wiki.getTiddlersWithTag('BrewLog');
    var usedGrams = 0;
    var brewCount = 0;

    for (var index = 0; index < allBrews.length; index++) {
      var brew = wiki.getTiddler(allBrews[index]);
      if (brew && brew.fields['coffee-bag-instance'] === bagTitle) {
        brewCount++;
        var dose = parseFloat(brew.getFieldString('dose'));
        if (!isNaN(dose) && dose > 0) {
          usedGrams += dose;
        }
      }
    }

    var remainingGrams = hasWeight
      ? Math.max(0, Math.round(initialWeight - usedGrams + weightAdjustment))
      : null;

    return {
      hasWeight: hasWeight,
      initialWeight: initialWeight,
      usedGrams: Math.round(usedGrams),
      weightAdjustment: Math.round(weightAdjustment),
      remainingGrams: remainingGrams,
      brewCount: brewCount,
    };
  }

  exports['bag-raw-weight'] = function(source) {
    var results = [];

    source(function(tiddler, title) {
      var raw = tiddler ? tiddler.getFieldString('weight') : title;
      var weight = parsePositiveNumber(raw);
      if (weight !== null) {
        results.push(Math.round(weight).toString());
      }
    });

    return results;
  };

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

  exports['bag-cost-per-100g'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      if (tiddler) {
        var cost = parsePositiveNumber(tiddler.getFieldString('cost'));
        var stats = getBagStats(wiki, tiddler, title);
        if (cost !== null && stats.hasWeight) {
          var per100g = (cost / stats.initialWeight) * 100;
          results.push(per100g.toFixed(2));
        }
      }
    });

    return results;
  };

  exports['brew-cost'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var operandDose = parsePositiveNumber(operator.operand);

    source(function(tiddler, title) {
      if (!tiddler) return;

      var bagTiddler = null;
      var bagTitle = '';
      var dose = null;

      if (tiddler.hasTag('BrewLog')) {
        bagTitle = tiddler.getFieldString('coffee-bag-instance');
        bagTiddler = bagTitle ? wiki.getTiddler(bagTitle) : null;
        dose = operandDose || parsePositiveNumber(tiddler.getFieldString('dose'));
      } else {
        bagTitle = title;
        bagTiddler = tiddler;
        var stats = getBagStats(wiki, bagTiddler, bagTitle);
        var avgDose = stats.brewCount > 0 && stats.usedGrams > 0
          ? stats.usedGrams / stats.brewCount
          : null;
        dose = operandDose || avgDose;
      }

      if (!bagTiddler || dose === null) return;
      var cost = parsePositiveNumber(bagTiddler.getFieldString('cost'));
      var weight = parsePositiveNumber(bagTiddler.getFieldString('weight'));
      if (cost !== null && weight !== null) {
        var brewCost = (cost / weight) * dose;
        results.push(brewCost.toFixed(2));
      }
    });

    return results;
  };

  exports['bag-best-brew'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      var bagTiddler = tiddler || (title ? wiki.getTiddler(title) : null);
      if (!bagTiddler) return;

      var pinned = bagTiddler.getFieldString('best-brew');
      if (pinned) {
        var pinnedTiddler = wiki.getTiddler(pinned);
        if (
          pinnedTiddler &&
          pinnedTiddler.fields['coffee-bag-instance'] === title
        ) {
          results.push(pinned);
          return;
        }
      }

      var allBrews = wiki.getTiddlersWithTag('BrewLog');
      var bestTitle = null;
      var bestRating = -1;
      var bestSortKey = '';

      for (var index = 0; index < allBrews.length; index++) {
        var brewTitle = allBrews[index];
        var brew = wiki.getTiddler(brewTitle);
        if (brew && brew.fields['coffee-bag-instance'] === title) {
          var rating = parseFloat(brew.getFieldString('overall-rating'));
          if (!isNaN(rating) && rating > 0) {
            var sortKey = (brew.getFieldString('brew-date') || '') +
              'T' +
              (brew.getFieldString('brew-time') || '') +
              '|' +
              (brew.getFieldString('created') || '');
            if (
              rating > bestRating ||
              (rating === bestRating && sortKey >= bestSortKey)
            ) {
              bestRating = rating;
              bestTitle = brewTitle;
              bestSortKey = sortKey;
            }
          }
        }
      }

      if (bestTitle !== null) {
        results.push(bestTitle);
      }
    });

    return results;
  };
})();
