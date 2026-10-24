describe('Coffee Tracker plugin tests', function() {
  it('should calculate days-since-roast accurately for today, past dates, and explicit target dates', function() {
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;

    expect(
      $tw.wiki.filterTiddlers('[[' + todayStr + ']days-since-roast[]]'),
    ).toEqual(['0']);
    expect(
      $tw.wiki.filterTiddlers('[[2026-01-10]days-since-roast[2026-01-24]]'),
    ).toEqual(['14']);

    // Even if a Journal tiddler titled '2026-01-10' exists without a roast-date field,
    // days-since-roast should still fall back to parsing the title as a date string
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: '2026-01-10',
        tags: ['Journal'],
        text: 'Daily journal entry',
      }),
    );
    expect(
      $tw.wiki.filterTiddlers('[[2026-01-10]days-since-roast[2026-01-24]]'),
    ).toEqual(['14']);
  });

  it('should pause days-since-roast when a bag is tagged Frozen and subtract frozen-days', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Frozen Bag Test',
        tags: ['CoffeeBagInstance', 'Frozen'],
        'roast-date': '2026-01-01',
        'frozen-date': '2026-01-12',
        'frozen-days': '3',
      }),
    );

    // Paused at 2026-01-12 (11 days since roast) minus 3 prior frozen days = 8 days
    expect(
      $tw.wiki.filterTiddlers('[[Frozen Bag Test]days-since-roast[roast-date]]'),
    ).toEqual(['8']);
  });

  it('should calculate brew-day roast age for BrewLog tiddlers', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Age Bag Instance',
        tags: ['CoffeeBagInstance'],
        'roast-date': '2026-02-01',
        'frozen-days': '2',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Age Brew Log 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Age Bag Instance',
        'brew-date': '2026-02-15',
      }),
    );

    // 14 days between roast and brew minus 2 frozen days = 12
    expect(
      $tw.wiki.filterTiddlers('[[Age Brew Log 1]brew-roast-age[]]'),
    ).toEqual(['12']);
    expect(
      $tw.wiki.filterTiddlers('[[Age Brew Log 1]days-since-roast[]]'),
    ).toEqual(['12']);
  });

  it('should compute coffee-bag-avg-of-avgs safely even with brackets in title', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Bag [Special]',
        tags: ['CoffeeBag'],
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Instance [1]',
        tags: ['CoffeeBagInstance'],
        'coffee-bag': 'Test Bag [Special]',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Brew 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Test Instance [1]',
        'overall-rating': '8',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Brew 2',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Test Instance [1]',
        'overall-rating': '9',
      }),
    );

    var avgMacro = $tw.macros['coffee-bag-avg-of-avgs'];
    expect(avgMacro).toBeDefined();
    expect(avgMacro.run('Test Bag [Special]')).toEqual('8.5');
  });

  it('should calculate remaining-bag-weight, bag-raw-weight, and bag-running-low with weight-adjustment', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Weighted Bag 1',
        tags: ['CoffeeBagInstance'],
        weight: '250g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Weighted Brew 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Weighted Bag 1',
        dose: '20',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Weighted Brew 2',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Weighted Bag 1',
        dose: '190',
      }),
    );

    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-raw-weight[]]'),
    ).toEqual(['250']);
    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]remaining-bag-weight[]]'),
    ).toEqual(['40']);
    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-running-low[45]]'),
    ).toEqual(['Weighted Bag 1']);
    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-running-low[30]]'),
    ).toEqual([]);

    // Apply a -15g scale calibration adjustment (e.g. grinder retention/purge loss)
    $tw.wiki.addTiddler(
      new $tw.Tiddler($tw.wiki.getTiddler('Weighted Bag 1'), {
        'weight-adjustment': '-15',
      }),
    );
    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]remaining-bag-weight[]]'),
    ).toEqual(['25']);
    expect(
      $tw.wiki.filterTiddlers('[[Weighted Bag 1]bag-running-low[30]]'),
    ).toEqual(['Weighted Bag 1']);
  });

  it('should calculate bag-cost-per-100g and brew-cost accurately', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Economics Bag 1',
        tags: ['CoffeeBagInstance'],
        cost: '$22.50',
        weight: '250g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Economics Brew 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Economics Bag 1',
        dose: '20',
      }),
    );

    // ($22.50 / 250g) * 100 = $9.00 / 100g
    expect(
      $tw.wiki.filterTiddlers('[[Economics Bag 1]bag-cost-per-100g[]]'),
    ).toEqual(['9.00']);

    // ($22.50 / 250g) * 20g = $1.80
    expect(
      $tw.wiki.filterTiddlers('[[Economics Brew 1]brew-cost[]]'),
    ).toEqual(['1.80']);
    expect(
      $tw.wiki.filterTiddlers('[[Economics Bag 1]brew-cost[]]'),
    ).toEqual(['1.80']);
    expect(
      $tw.wiki.filterTiddlers('[[Economics Bag 1]brew-cost[15]]'),
    ).toEqual(['1.35']);
  });

  it('should resolve bag-best-brew from pinned best-brew or highest-rated fallback', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Best Brew Bag',
        tags: ['CoffeeBagInstance'],
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Best Brew Candidate 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Best Brew Bag',
        'brew-date': '2026-03-01',
        'overall-rating': '7.5',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Best Brew Candidate 2',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Best Brew Bag',
        'brew-date': '2026-03-02',
        'overall-rating': '9.0',
      }),
    );

    // Auto-selects highest rated brew
    expect(
      $tw.wiki.filterTiddlers('[[Best Brew Bag]bag-best-brew[]]'),
    ).toEqual(['Best Brew Candidate 2']);

    // Pin Candidate 1 explicitly
    $tw.wiki.addTiddler(
      new $tw.Tiddler($tw.wiki.getTiddler('Best Brew Bag'), {
        'best-brew': 'Best Brew Candidate 1',
      }),
    );
    expect(
      $tw.wiki.filterTiddlers('[[Best Brew Bag]bag-best-brew[]]'),
    ).toEqual(['Best Brew Candidate 1']);
  });

  it('should render Phase 1 UI templates with procedures, functions, economics, and brew age', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Supernova Espresso',
        tags: ['CoffeeBag'],
        'coffee-name': 'Supernova Espresso',
        roaster: 'Gemini Coffee Roasters',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Supernova Espresso - 2024-01-20',
        tags: ['CoffeeBagInstance'],
        'coffee-bag': 'Supernova Espresso',
        'purchase-date': '2024-01-20',
        'roast-date': '2024-01-15',
        cost: '$20.00',
        weight: '340g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Brew Log: 2026-01-29 09:55',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Supernova Espresso - 2024-01-20',
        'brew-date': '2024-01-29',
        'brew-time': '09:55',
        'brew-method': 'Pour Over',
        dose: '20',
        water: '330',
        yield: '19',
        'overall-rating': '5.5',
      }),
    );

    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Bag Instance',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Supernova Espresso - 2024-01-20">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/coffee-bag-instance/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var bagHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Bag Instance');
    expect(bagHtml).toContain('$5.88 / 100g');
    expect(bagHtml).toContain('Set Actual Weight');
    expect(bagHtml).toContain('Freeze Bag');
    expect(bagHtml).toContain('$1.18');
    expect(bagHtml).toContain('(14d)');

    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Brew Log',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Brew Log: 2026-01-29 09:55">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/brew-log/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var brewHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Brew Log');
    expect(brewHtml).toContain('Day 14 off roast');
    expect(brewHtml).toContain('$1.18');
    expect(brewHtml).toContain('1:16.5');

    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Coffee Type',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Supernova Espresso">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/coffee-bag/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var coffeeTypeHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Coffee Type');
    expect(coffeeTypeHtml).toContain('5.5 /10');

    // Verify BrewLog with water but blank/0 dose does not render 1:Infinity
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Brew Log Zero Dose',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Supernova Espresso - 2024-01-20',
        'brew-date': '2024-01-29',
        dose: '0',
        water: '300',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Zero Dose',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Brew Log Zero Dose">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/brew-log/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var zeroDoseHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Zero Dose');
    expect(zeroDoseHtml).not.toContain('Infinity');
  });
});
