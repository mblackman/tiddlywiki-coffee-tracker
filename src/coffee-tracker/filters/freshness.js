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

  exports['bag-raw-cost'] = function(source) {
    var results = [];

    source(function(tiddler, title) {
      var raw = tiddler ? tiddler.getFieldString('cost') : title;
      var cost = parsePositiveNumber(raw);
      if (cost !== null) {
        results.push(cost.toFixed(2));
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

  /*
  Phase 2: Interactive Coffee Compass & Grinder Analytics Operators
  */
  function getCompassAdviceForTags(tags) {
    if (!tags || tags.length === 0) return null;
    var has = {};
    for (var i = 0; i < tags.length; i++) {
      has[tags[i]] = true;
    }

    if (has.Sour && has.Bitter) {
      return 'Uneven Extraction (Channeling): Grind slightly coarser and improve puck/bed prep (WDT, gentle level pour) so water extracts evenly.';
    }
    if (has.Sour && has.Weak) {
      return 'Under-Extracted & Weak: Grind 1–2 steps finer, increase water temperature (+1–2°C), or extend contact time.';
    }
    if (has.Bitter && has.Heavy) {
      return 'Over-Extracted & Heavy: Grind 1–2 steps coarser, lower water temperature (-1–2°C), or add slightly more water.';
    }
    if (has.Sour) {
      return 'Under-Extracted (Sour): Extract more by grinding finer, raising water temperature, or extending your brew ratio (more water).';
    }
    if (has.Bitter) {
      return 'Over-Extracted (Bitter): Extract less by grinding coarser, lowering water temperature, or shortening your brew ratio.';
    }
    if (has.Astringent) {
      return 'Astringent (Dryness / Channeling): Pour more gently, avoid agitating late in the drawdown, or grind slightly coarser.';
    }
    if (has.Weak) {
      return 'Weak / Thin Body: Brew stronger by tightening your ratio (higher dose or less water) or grinding slightly finer.';
    }
    if (has.Heavy) {
      return 'Heavy / Muddy Body: Open up clarity by lengthening your ratio (more water) while keeping extraction time similar.';
    }
    if (has.Balanced) {
      return 'Balanced Sweet Spot: Great extraction! Consider pinning this brew as your Best Reference for this bag.';
    }
    return null;
  }

  exports['compass-advice'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      var rawNotes = '';
      var targetTiddler = tiddler || (title && wiki ? wiki.getTiddler(title) : null);
      if (targetTiddler && targetTiddler.hasTag('BrewLog')) {
        rawNotes = targetTiddler.getFieldString('extraction-notes');
      } else {
        rawNotes = title || '';
      }
      var tags = $tw.utils.parseStringArray(rawNotes) || [];
      var advice = getCompassAdviceForTags(tags);
      if (advice) {
        results.push(advice);
      }
    });

    return results;
  };

  exports['grinder-total-grams'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      if (!title) return;
      var allBrews = wiki.getTiddlersWithTag('BrewLog');
      var totalGrams = 0;
      for (var i = 0; i < allBrews.length; i++) {
        var brew = wiki.getTiddler(allBrews[i]);
        if (brew && brew.getFieldString('grinder') === title) {
          var dose = parsePositiveNumber(brew.getFieldString('dose'));
          if (dose !== null) {
            totalGrams += dose;
          }
        }
      }
      results.push(Math.round(totalGrams).toString());
    });

    return results;
  };

  function getGrinderBrews(wiki, grinderTitle, brewerTitle, excludeBrewTitle) {
    var allBrews = wiki.getTiddlersWithTag('BrewLog');
    var matches = [];
    for (var i = 0; i < allBrews.length; i++) {
      var brewTitle = allBrews[i];
      if (excludeBrewTitle && brewTitle === excludeBrewTitle) continue;
      var brew = wiki.getTiddler(brewTitle);
      if (!brew) continue;
      if (brew.getFieldString('grinder') !== grinderTitle) continue;
      var grindSize = (brew.getFieldString('grind-size') || '').trim();
      if (!grindSize) continue;
      if (brewerTitle && brew.getFieldString('brewer') !== brewerTitle) continue;
      matches.push({
        title: brewTitle,
        tiddler: brew,
        grindSize: grindSize,
        rating: parseFloat(brew.getFieldString('overall-rating')),
      });
    }
    return matches;
  }

  function summarizeGrindRange(matches) {
    if (!matches || matches.length === 0) return '';
    var numericVals = [];
    var allNumeric = true;
    var uniqueStrings = [];

    for (var i = 0; i < matches.length; i++) {
      var g = matches[i].grindSize;
      if (uniqueStrings.indexOf(g) === -1) {
        uniqueStrings.push(g);
      }
      if (/^\d+(\.\d+)?$/.test(g)) {
        numericVals.push(parseFloat(g));
      } else {
        allNumeric = false;
      }
    }

    if (allNumeric && numericVals.length > 0) {
      var minVal = Math.min.apply(null, numericVals);
      var maxVal = Math.max.apply(null, numericVals);
      return minVal === maxVal ? String(minVal) : minVal + ' – ' + maxVal;
    }
    return uniqueStrings.slice(0, 3).join(', ');
  }

  function findBestGrinderBrew(matches) {
    var best = null;
    var bestRating = -1;
    var bestSortKey = '';
    for (var i = 0; i < matches.length; i++) {
      var item = matches[i];
      var r = !isNaN(item.rating) ? item.rating : 0;
      var sortKey = (item.tiddler.getFieldString('brew-date') || '') +
        'T' +
        (item.tiddler.getFieldString('brew-time') || '') +
        '|' +
        (item.tiddler.getFieldString('created') || '');
      if (r > bestRating || (r === bestRating && sortKey >= bestSortKey)) {
        bestRating = r;
        best = item;
        bestSortKey = sortKey;
      }
    }
    return best;
  }

  exports['grinder-brewer-range'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var brewerTitle = operator.operand || '';

    source(function(tiddler, title) {
      if (!title) return;
      var matches = getGrinderBrews(wiki, title, brewerTitle, '');
      var range = summarizeGrindRange(matches);
      if (range) {
        results.push(range);
      }
    });

    return results;
  };

  exports['grinder-brewer-best'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var brewerTitle = operator.operand || '';

    source(function(tiddler, title) {
      if (!title) return;
      var matches = getGrinderBrews(wiki, title, brewerTitle, '');
      var best = findBestGrinderBrew(matches);
      if (best) {
        results.push(best.title);
      }
    });

    return results;
  };

  exports['grinder-starting-hint'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var operandBrewer = operator.operand || '';

    source(function(tiddler, title) {
      var targetTiddler = tiddler || (title && wiki ? wiki.getTiddler(title) : null);
      var grinderTitle = '';
      var brewerTitle = operandBrewer;
      var excludeBrew = '';
      var targetRoast = '';
      var targetProcess = '';

      if (targetTiddler && targetTiddler.hasTag('BrewLog')) {
        excludeBrew = title;
        grinderTitle = targetTiddler.getFieldString('grinder');
        brewerTitle = brewerTitle || targetTiddler.getFieldString('brewer');
        var bagInstanceTitle = targetTiddler.getFieldString('coffee-bag-instance');
        var bagInstance = bagInstanceTitle ? wiki.getTiddler(bagInstanceTitle) : null;
        var coffeeTypeTitle = bagInstance ? bagInstance.getFieldString('coffee-bag') : '';
        var coffeeType = coffeeTypeTitle ? wiki.getTiddler(coffeeTypeTitle) : null;
        if (coffeeType) {
          targetRoast = coffeeType.getFieldString('coffee-roast-level') || '';
          targetProcess = coffeeType.getFieldString('coffee-processing') || '';
        }
      } else {
        grinderTitle = title;
      }

      if (!grinderTitle) return;

      var matches = getGrinderBrews(wiki, grinderTitle, brewerTitle, excludeBrew);
      if (matches.length === 0) return;

      var profileMatches = [];
      if (targetRoast || targetProcess) {
        for (var i = 0; i < matches.length; i++) {
          var b = matches[i].tiddler;
          var bi = wiki.getTiddler(b.getFieldString('coffee-bag-instance'));
          var ct = bi ? wiki.getTiddler(bi.getFieldString('coffee-bag')) : null;
          if (ct) {
            var rMatch = targetRoast && ct.getFieldString('coffee-roast-level') === targetRoast;
            var pMatch = targetProcess && ct.getFieldString('coffee-processing') === targetProcess;
            if (rMatch || pMatch) {
              profileMatches.push(matches[i]);
            }
          }
        }
      }

      var best = findBestGrinderBrew(profileMatches.length > 0 ? profileMatches : matches);
      var range = summarizeGrindRange(matches);
      if (!best) return;

      if (operator.suffix === 'grind') {
        results.push(best.grindSize);
        return;
      }

      var hint = 'Suggested starting grind: ' + best.grindSize;
      var details = [];
      if (!isNaN(best.rating) && best.rating > 0) {
        details.push('best ★ ' + best.rating + '/10');
      }
      if (range && range !== best.grindSize) {
        details.push('typical range ' + range);
      }
      details.push('from ' + matches.length + (matches.length === 1 ? ' prior brew' : ' prior brews'));
      results.push(hint + ' (' + details.join(' • ') + ')');
    });

    return results;
  };

  /*
  Phase 3: Pure-SVG Sensory Radar & Progression Chart Operators
  */
  var SENSORY_AXES = [
    'aroma',
    'flavor',
    'acidity',
    'body',
    'sweetness',
    'aftertaste',
  ];

  function computeSensoryScores(wiki, tiddler, title) {
    var target = tiddler || (title && wiki ? wiki.getTiddler(title) : null);
    if (!target) return null;

    var scores = {};
    var hasAny = false;
    var i;
    var attr;

    if (target.hasTag('BrewLog')) {
      for (i = 0; i < SENSORY_AXES.length; i++) {
        attr = SENSORY_AXES[i];
        var val = parseFloat(target.getFieldString('rating-' + attr));
        if (!isNaN(val) && val > 0) {
          scores[attr] = Math.min(10, Math.max(0, val));
          hasAny = true;
        } else {
          scores[attr] = 0;
        }
      }
      return hasAny ? scores : null;
    }

    var matchingBags = {};
    if (target.hasTag('CoffeeBagInstance')) {
      matchingBags[title] = true;
    } else if (target.hasTag('CoffeeBag')) {
      var allInstances = wiki.getTiddlersWithTag('CoffeeBagInstance');
      for (i = 0; i < allInstances.length; i++) {
        var inst = wiki.getTiddler(allInstances[i]);
        if (inst && inst.getFieldString('coffee-bag') === title) {
          matchingBags[allInstances[i]] = true;
        }
      }
    } else {
      return null;
    }

    var sums = {};
    var counts = {};
    for (i = 0; i < SENSORY_AXES.length; i++) {
      sums[SENSORY_AXES[i]] = 0;
      counts[SENSORY_AXES[i]] = 0;
    }

    var allBrews = wiki.getTiddlersWithTag('BrewLog');
    for (i = 0; i < allBrews.length; i++) {
      var brew = wiki.getTiddler(allBrews[i]);
      if (brew && matchingBags[brew.getFieldString('coffee-bag-instance')]) {
        for (var j = 0; j < SENSORY_AXES.length; j++) {
          attr = SENSORY_AXES[j];
          var bVal = parseFloat(brew.getFieldString('rating-' + attr));
          if (!isNaN(bVal) && bVal > 0) {
            sums[attr] += Math.min(10, Math.max(0, bVal));
            counts[attr] += 1;
            hasAny = true;
          }
        }
      }
    }

    if (!hasAny) return null;
    for (i = 0; i < SENSORY_AXES.length; i++) {
      attr = SENSORY_AXES[i];
      scores[attr] = counts[attr] > 0 ? sums[attr] / counts[attr] : 0;
    }
    return scores;
  }

  function radarVertexCoord(axisIndex, score) {
    var cx = 130;
    var cy = 115;
    var maxR = 72;
    var clamped = Math.min(10, Math.max(0, score || 0));
    var r = (clamped / 10) * maxR;
    var angleRad = ((axisIndex * 60) - 90) * (Math.PI / 180);
    var x = cx + r * Math.cos(angleRad);
    var y = cy + r * Math.sin(angleRad);
    return {
      x: x.toFixed(1),
      y: y.toFixed(1),
    };
  }

  exports['sensory-score'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var attr = (operator.operand || '').trim().toLowerCase();

    source(function(tiddler, title) {
      var scores = computeSensoryScores(wiki, tiddler, title);
      if (scores && typeof scores[attr] === 'number' && scores[attr] > 0) {
        var rounded = Math.round(scores[attr] * 10) / 10;
        results.push(String(rounded));
      }
    });

    return results;
  };

  exports['sensory-radar-points'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      var scores = computeSensoryScores(wiki, tiddler, title);
      if (!scores) return;
      var pts = [];
      for (var i = 0; i < SENSORY_AXES.length; i++) {
        var pt = radarVertexCoord(i, scores[SENSORY_AXES[i]]);
        pts.push(pt.x + ',' + pt.y);
      }
      results.push(pts.join(' '));
    });

    return results;
  };

  exports['sensory-axis-point'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var parts = (operator.operand || '').split(':');
    var attr = (parts[0] || '').trim().toLowerCase();
    var coordPart = (operator.suffix || parts[1] || '').trim().toLowerCase();
    var axisIndex = SENSORY_AXES.indexOf(attr);

    source(function(tiddler, title) {
      if (axisIndex === -1) return;
      var scores = computeSensoryScores(wiki, tiddler, title);
      if (!scores) return;
      var pt = radarVertexCoord(axisIndex, scores[attr]);
      if (coordPart === 'x') {
        results.push(pt.x);
      } else if (coordPart === 'y') {
        results.push(pt.y);
      } else {
        results.push(pt.x + ',' + pt.y);
      }
    });

    return results;
  };

  exports['bag-progression-points'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;

    source(function(tiddler, title) {
      if (!title) return;
      var allBrews = wiki.getTiddlersWithTag('BrewLog');
      var ratedBrews = [];

      for (var i = 0; i < allBrews.length; i++) {
        var brew = wiki.getTiddler(allBrews[i]);
        if (!brew) continue;
        if (title !== 'all' && brew.getFieldString('coffee-bag-instance') !== title) {
          continue;
        }
        var rating = parseFloat(brew.getFieldString('overall-rating'));
        if (!isNaN(rating) && rating > 0) {
          var sortKey = (brew.getFieldString('brew-date') || '') +
            'T' +
            (brew.getFieldString('brew-time') || '') +
            '|' +
            (brew.getFieldString('created') || '') +
            '|' +
            allBrews[i];
          ratedBrews.push({
            title: allBrews[i],
            rating: Math.min(10, Math.max(0, rating)),
            sortKey: sortKey,
          });
        }
      }

      if (ratedBrews.length < 2) return;

      ratedBrews.sort(function(a, b) {
        return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0;
      });

      if (title === 'all' && ratedBrews.length > 20) {
        ratedBrews = ratedBrews.slice(ratedBrews.length - 20);
      }

      var minX = 35;
      var maxX = 395;
      var minY = 15;
      var maxY = 115;
      var count = ratedBrews.length;
      var pts = [];

      for (var j = 0; j < count; j++) {
        var item = ratedBrews[j];
        var brewTiddler = wiki.getTiddler(item.title);
        var roastAge = computeBrewRoastAge(wiki, brewTiddler);
        var brewDate = brewTiddler ? (brewTiddler.getFieldString('brew-date') || '') : '';
        var shortDate = brewDate.length >= 10 ? brewDate.slice(5) : brewDate;
        var pointLabel = roastAge !== null ? (roastAge + 'd') : (shortDate || ('#' + (j + 1)));
        var x = minX + (j / (count - 1)) * (maxX - minX);
        var y = maxY - (item.rating / 10) * (maxY - minY);
        if (operator.suffix === 'meta') {
          results.push(
            x.toFixed(1) + '|' + y.toFixed(1) + '|' + item.rating + '|' + pointLabel,
          );
        } else {
          pts.push(x.toFixed(1) + ',' + y.toFixed(1));
        }
      }

      if (operator.suffix !== 'meta') {
        results.push(pts.join(' '));
      }
    });

    return results;
  };

  exports['tasting-note-tokens'] = function(source, operator, options) {
    var results = [];
    var wiki = options && options.wiki ? options.wiki : $tw.wiki;
    var counts = {};
    var displayNames = {};

    source(function(tiddler, title) {
      var target = tiddler || (title && wiki ? wiki.getTiddler(title) : null);
      var raw = target
        ? target.getFieldString('coffee-tasting-notes')
        : title || '';
      if (!raw) return;
      var tokens = String(raw).split(/[,;/•&]+|\band\b/i);
      for (var i = 0; i < tokens.length; i++) {
        var cleaned = tokens[i].trim().replace(/\.$/, '');
        if (!cleaned) continue;
        var key = cleaned.toLowerCase();
        var titleCase = cleaned.replace(/(^|[\s-])([a-z])/g, function(match, sep, ch) {
          return sep + ch.toUpperCase();
        });
        counts[key] = (counts[key] || 0) + 1;
        if (!displayNames[key]) {
          displayNames[key] = titleCase;
        }
      }
    });

    var keys = Object.keys(counts);
    keys.sort(function(a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return displayNames[a] < displayNames[b] ? -1 : 1;
    });

    var withCounts = operator.suffix === 'count';
    for (var k = 0; k < keys.length; k++) {
      var tokenKey = keys[k];
      if (withCounts) {
        results.push(displayNames[tokenKey] + ' (' + counts[tokenKey] + ')');
      } else {
        results.push(displayNames[tokenKey]);
      }
    }

    return results;
  };
})();
