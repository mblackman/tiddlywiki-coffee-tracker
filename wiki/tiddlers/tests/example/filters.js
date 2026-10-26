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

  it('should provide Coffee Compass extraction advice and next-brew-adjustment rendering', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Compass Brew 1',
        tags: ['BrewLog'],
        'extraction-notes': 'Sour Weak',
        'next-brew-adjustment': 'Grind 2 clicks finer (17)',
        'overall-rating': '6.5',
      }),
    );

    var advice = $tw.wiki.filterTiddlers('[[Compass Brew 1]compass-advice[]]')[0];
    expect(advice).toContain('Under-Extracted & Weak');
    expect(
      $tw.wiki.filterTiddlers('[[Sour Bitter]compass-advice[]]')[0],
    ).toContain('Uneven Extraction');
    expect(
      $tw.wiki.filterTiddlers('[[Balanced]compass-advice[]]')[0],
    ).toContain('Balanced Sweet Spot');

    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Compass Brew',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Compass Brew 1">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/brew-log/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var compassHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Compass Brew');
    expect(compassHtml).toContain('Under-Extracted &amp; Weak');
    expect(compassHtml).toContain('Grind 2 clicks finer (17)');
  });

  it('should compute grinder total weight, brewer grind matrix, and starting grind hints', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Grinder EK43',
        tags: ['Equipment'],
        'equipment-name': 'Test Grinder EK43',
        'equipment-type': 'Grinder',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Test Brewer Kalita',
        tags: ['Equipment'],
        'equipment-name': 'Test Brewer Kalita',
        'equipment-type': 'Brewer',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Kenya AA',
        tags: ['CoffeeBag'],
        'coffee-name': 'Kenya AA',
        'coffee-origin': 'Kenya',
        'coffee-roast-level': 'Light',
        'coffee-processing': 'Washed',
        'coffee-tasting-notes': 'Blackcurrant, Bergamot, Grapefruit',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Kenya AA - Bag 1',
        tags: ['CoffeeBagInstance'],
        'coffee-bag': 'Kenya AA',
        cost: '$24.00',
        weight: '250g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Grinder Brew 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Kenya AA - Bag 1',
        grinder: 'Test Grinder EK43',
        brewer: 'Test Brewer Kalita',
        'brew-date': '2026-03-01',
        dose: '18',
        'grind-size': '22',
        'overall-rating': '7.5',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Grinder Brew 2',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Kenya AA - Bag 1',
        grinder: 'Test Grinder EK43',
        brewer: 'Test Brewer Kalita',
        'brew-date': '2026-03-02',
        dose: '20',
        'grind-size': '20',
        'overall-rating': '9.0',
      }),
    );

    expect(
      $tw.wiki.filterTiddlers('[[Test Grinder EK43]grinder-total-grams[]]'),
    ).toEqual(['38']);
    expect(
      $tw.wiki.filterTiddlers('[[Test Grinder EK43]grinder-brewer-range[Test Brewer Kalita]]'),
    ).toEqual(['20 – 22']);
    expect(
      $tw.wiki.filterTiddlers('[[Test Grinder EK43]grinder-brewer-best[Test Brewer Kalita]]'),
    ).toEqual(['Grinder Brew 2']);

    // New bag dial-in hint test
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'New Dial-In Brew',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Kenya AA - Bag 1',
        grinder: 'Test Grinder EK43',
        brewer: 'Test Brewer Kalita',
      }),
    );
    var hint = $tw.wiki.filterTiddlers('[[New Dial-In Brew]grinder-starting-hint[]]')[0];
    expect(hint).toContain('Suggested starting grind: 20');
    expect(hint).toContain('20 – 22');
    expect(
      $tw.wiki.filterTiddlers('[[New Dial-In Brew]grinder-starting-hint:grind[]]'),
    ).toEqual(['20']);

    // Render Equipment View for Grinder
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Grinder View',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Test Grinder EK43">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/equipment/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var grinderHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Grinder View');
    expect(grinderHtml).toContain('38g');
    expect(grinderHtml).toContain('Dial-In Grind Setting Matrix');
    expect(grinderHtml).toContain('20 – 22');

    // Test >= 1000g display format (no duplicate trailing g)
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Grinder Brew Heavy',
        tags: ['BrewLog'],
        grinder: 'Test Grinder EK43',
        dose: '1212',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Grinder Heavy',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$text text={{{ [ct.grinder-total-display[Test Grinder EK43]] }}}/>',
      }),
    );
    expect(
      $tw.wiki.renderTiddler('text/plain', 'Render Wrapper Grinder Heavy'),
    ).toEqual('1.25 kg (1250g)');
  });

  it('should compute Pure-SVG sensory radar coordinates, progression trendlines, and render the Analytics view', function() {
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Sensory Coffee Type',
        tags: ['CoffeeBag'],
        'coffee-name': 'Sensory Coffee Type',
        'coffee-origin': 'Ethiopia',
        'coffee-roast-level': 'Light',
        'coffee-processing': 'Natural',
        'coffee-tasting-notes': "Jasmine, Bergamot, Baker's Chocolate",
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Sensory Bag 1',
        tags: ['CoffeeBagInstance'],
        'coffee-bag': 'Sensory Coffee Type',
        'roast-date': '2026-02-20',
        cost: '$25.00',
        weight: '250g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Sensory Bag Unbrewed',
        tags: ['CoffeeBagInstance'],
        'coffee-bag': 'Sensory Coffee Type',
        'roast-date': '2026-02-25',
        cost: '$25.00',
        weight: '250g',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Sensory Brew 1',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Sensory Bag 1',
        'brew-date': '2026-03-01',
        'rating-aroma': '9',
        'rating-flavor': '8.5',
        'rating-acidity': '9',
        'rating-body': '7.5',
        'rating-sweetness': '8',
        'rating-aftertaste': '8.5',
        'overall-rating': '8.0',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Sensory Brew 2',
        tags: ['BrewLog'],
        'coffee-bag-instance': 'Sensory Bag 1',
        'brew-date': '2026-03-03',
        'rating-aroma': '9',
        'rating-flavor': '9.5',
        'rating-acidity': '9',
        'rating-body': '8.5',
        'rating-sweetness': '9',
        'rating-aftertaste': '9.5',
        'overall-rating': '9.5',
      }),
    );

    var radarPoints = $tw.wiki.filterTiddlers('[[Sensory Brew 1]sensory-radar-points[]]')[0];
    expect(radarPoints).toBeDefined();
    expect(radarPoints.split(' ').length).toBe(6);

    // Bag-level averaged sensory score & radar points
    expect(
      $tw.wiki.filterTiddlers('[[Sensory Bag 1]sensory-score[aroma]]'),
    ).toEqual(['9']);
    expect(
      $tw.wiki.filterTiddlers('[[Sensory Coffee Type]sensory-score[flavor]]'),
    ).toEqual(['9']);

    // Progression points & roast-age meta for Sensory Bag 1 (2 rated brews: 9d and 11d off roast)
    var progPoints = $tw.wiki.filterTiddlers('[[Sensory Bag 1]bag-progression-points[]]')[0];
    expect(progPoints).toBeDefined();
    expect(progPoints.split(' ').length).toBe(2);
    var progMeta = $tw.wiki.filterTiddlers('[[Sensory Bag 1]bag-progression-points:meta[]]');
    expect(progMeta[0]).toContain('|8|9d');
    expect(progMeta[1]).toContain('|9.5|11d');

    // Tasting note tokens (including apostrophe-safe title case)
    var notes = $tw.wiki.filterTiddlers('[[Sensory Coffee Type]tasting-note-tokens:count[]]');
    expect(notes).toContain('Jasmine (1)');
    expect(notes).toContain("Baker's Chocolate (1)");

    // Ensure unbrewed bag does not render ~Infinity brews left or 0.0 /10
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Unbrewed Bag',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Sensory Bag Unbrewed">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/coffee-bag-instance/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var unbrewedHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Unbrewed Bag');
    expect(unbrewedHtml).not.toContain('Infinity');
    expect(unbrewedHtml).toContain('~13 brews left');
    expect(unbrewedHtml).not.toContain('0.0 /10');

    // Render Dedicated Analytics View (also exercises $ct.panel custom widget and ct-progression-chart)
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Analytics View',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/analytics" $mode="block"/>',
      }),
    );
    var analyticsHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Analytics View');
    expect(analyticsHtml).toContain('Coffee Insights &amp; Analytics');
    expect(analyticsHtml).toContain('Performance by Origin');
    expect(analyticsHtml).toContain('Ethiopia');
    expect(analyticsHtml).toContain('/10</span>');
    expect(analyticsHtml).toContain('Jasmine (1)');
    expect(analyticsHtml).toContain('Bergamot (');
    expect(analyticsHtml).toContain('<svg');
  });

  it('should step numeric metrics and brew time strings via step-metric and step-brew-time', function() {
    // step-metric: step|defaultVal|min|max
    expect(
      $tw.wiki.filterTiddlers('[[18]step-metric[0.5|18|0|100]]'),
    ).toEqual(['18.5']);
    expect(
      $tw.wiki.filterTiddlers('[[18.5]step-metric[-0.5|18|0|100]]'),
    ).toEqual(['18']);
    expect(
      $tw.wiki.filterTiddlers('[[]step-metric[0.5|18|0|100]]'),
    ).toEqual(['18']);
    expect(
      $tw.wiki.filterTiddlers('[[0]step-metric[-5|18|0|100]]'),
    ).toEqual(['0']);
    expect(
      $tw.wiki.filterTiddlers('[[9.8]step-metric[0.5|7|0|10]]'),
    ).toEqual(['10']);

    // step-brew-time: deltaSec|defaultSec
    expect(
      $tw.wiki.filterTiddlers('[[2:30]step-brew-time[5|150]]'),
    ).toEqual(['02:35']);
    expect(
      $tw.wiki.filterTiddlers('[[2:30]step-brew-time[-5|150]]'),
    ).toEqual(['02:25']);
    expect(
      $tw.wiki.filterTiddlers('[[]step-brew-time[5|150]]'),
    ).toEqual(['02:30']);
    expect(
      $tw.wiki.filterTiddlers('[[0:03]step-brew-time[-5|150]]'),
    ).toEqual(['00:00']);

    // Render Brew Log in Edit Mode to verify $ct.metric-stepper, ratio chips, and collapsible sensory section
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Stepper Test Brew 1',
        tags: ['BrewLog'],
        'brew-date': '2026-03-05',
        dose: '18',
        water: '288',
        'overall-rating': '8.5',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: '$:/state/coffee-tracker/edit/Stepper Test Brew 1',
        text: 'yes',
      }),
    );
    $tw.wiki.addTiddler(
      new $tw.Tiddler({
        title: 'Render Wrapper Edit Brew Log',
        text: '\\import [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]\n\n<$tiddler tiddler="Stepper Test Brew 1">\n\n<$transclude $tiddler="$:/plugins/mblackman/coffee-tracker/ui/brew-log/view" $mode="block"/>\n\n</$tiddler>',
      }),
    );
    var editBrewHtml = $tw.wiki.renderTiddler('text/html', 'Render Wrapper Edit Brew Log');
    expect(editBrewHtml).toContain('ct-stepper-control');
    expect(editBrewHtml).toContain('ct-ratio-presets');
    expect(editBrewHtml).toContain('Done Editing Brew Log');
  });
});
