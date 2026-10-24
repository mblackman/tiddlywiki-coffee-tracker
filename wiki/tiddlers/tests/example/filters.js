describe('Coffee Tracker plugin tests', function() {
  it('should calculate days-since-roast accurately for today and past dates', function() {
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;

    expect($tw.wiki.filterTiddlers('[[' + todayStr + ']days-since-roast[]]')).toEqual(['0']);
  });

  it('should compute coffee-bag-avg-of-avgs safely even with brackets in title', function() {
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Test Bag [Special]',
      tags: ['CoffeeBag'],
    }));
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Test Instance [1]',
      tags: ['CoffeeBagInstance'],
      'coffee-bag': 'Test Bag [Special]',
    }));
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Test Brew 1',
      tags: ['BrewLog'],
      'coffee-bag-instance': 'Test Instance [1]',
      'overall-rating': '8',
    }));
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Test Brew 2',
      tags: ['BrewLog'],
      'coffee-bag-instance': 'Test Instance [1]',
      'overall-rating': '9',
    }));

    var avgMacro = $tw.macros['coffee-bag-avg-of-avgs'];
    expect(avgMacro).toBeDefined();
    expect(avgMacro.run('Test Bag [Special]')).toEqual('8.5');
  });

  it('should calculate remaining-bag-weight and bag-running-low', function() {
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Weighted Bag 1',
      tags: ['CoffeeBagInstance'],
      weight: '250g',
    }));
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Weighted Brew 1',
      tags: ['BrewLog'],
      'coffee-bag-instance': 'Weighted Bag 1',
      dose: '20',
    }));
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: 'Weighted Brew 2',
      tags: ['BrewLog'],
      'coffee-bag-instance': 'Weighted Bag 1',
      dose: '190',
    }));

    expect($tw.wiki.filterTiddlers('[[Weighted Bag 1]remaining-bag-weight[]]')).toEqual(['40']);
    expect($tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-running-low[45]]')).toEqual(['Weighted Bag 1']);
    expect($tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-running-low[30]]')).toEqual([]);
  });
});
