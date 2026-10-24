/*\
title: $:/plugins/mblackman/coffee-tracker/macros/average-of-averages.js
type: application/javascript
module-type: macro

Calculates the average of per-instance average ratings for a coffee bag
\*/

(function() {
  'use strict';

  exports.name = 'coffee-bag-avg-of-avgs';

  exports.params = [
    { name: 'coffeeBag' },
  ];

  exports.run = function(coffeeBag) {
    if (!coffeeBag) return '';

    // Get all CoffeeBagInstance tiddlers for this coffee bag safely without filter string interpolation
    var allInstances = $tw.wiki.getTiddlersWithTag('CoffeeBagInstance');
    var instances = allInstances.filter(function(title) {
      var tiddler = $tw.wiki.getTiddler(title);
      return tiddler && tiddler.fields['coffee-bag'] === coffeeBag;
    });

    if (instances.length === 0) return '';

    var allBrews = $tw.wiki.getTiddlersWithTag('BrewLog');
    var instanceAverages = [];

    // For each instance, calculate average rating
    instances.forEach(function(instance) {
      var sum = 0;
      var count = 0;

      allBrews.forEach(function(brew) {
        var tiddler = $tw.wiki.getTiddler(brew);
        if (
          tiddler &&
          tiddler.fields['coffee-bag-instance'] === instance &&
          tiddler.fields['overall-rating'] !== undefined
        ) {
          var rating = parseFloat(tiddler.fields['overall-rating']);
          if (!isNaN(rating)) {
            sum += rating;
            count++;
          }
        }
      });

      if (count > 0) {
        instanceAverages.push(parseFloat((sum / count).toFixed(1)));
      }
    });

    // Calculate average of averages
    if (instanceAverages.length === 0) return '';

    var total = instanceAverages.reduce(function(a, b) {
      return a + b;
    }, 0);
    var avgOfAvgs = total / instanceAverages.length;

    return avgOfAvgs.toFixed(1);
  };
})();
