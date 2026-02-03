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

    // Get all CoffeeBagInstance tiddlers for this coffee bag
    var instances = $tw.wiki.filterTiddlers('[tag[CoffeeBagInstance]coffee-bag[' + coffeeBag + ']]');

    if (instances.length === 0) return '';

    var instanceAverages = [];

    // For each instance, calculate average rating
    instances.forEach(function(instance) {
      var brews = $tw.wiki.filterTiddlers('[tag[BrewLog]coffee-bag-instance[' + instance + ']has[overall-rating]]');

      if (brews.length > 0) {
        var sum = 0;
        var count = 0;

        brews.forEach(function(brew) {
          var tiddler = $tw.wiki.getTiddler(brew);
          if (tiddler) {
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
