# Coffee Tracker Plugin - Implementation Guide

## Overview
A comprehensive TiddlyWiki plugin for tracking your coffee brewing journey. Track equipment, beans, roasters, and individual brews to improve your coffee-making skills.

## Features Implemented

### 1. Creation Forms (Modals)
All creation modals are now fully functional and can be accessed from the dashboard or individual views:

- **Roaster Modal** - Add coffee roasters with name, location, and website
- **Coffee Type Modal** - Add coffee products with origin, roast level, varietal, processing method, and tasting notes
- **Coffee Bag Instance Modal** - Track specific coffee purchases with dates, cost, weight, and personal thoughts
- **Equipment Modal** - Add brewing equipment (brewers, grinders, scales, kettles)
- **Brew Log Modal** - Quick brew logging with essential information

### 2. Enhanced Views

#### Dashboard (`$:/plugins/mblackman/coffee-tracker/ui/dashboard`)
- Quick action buttons for creating all entity types
- Active coffee bags display
- Recent brews table (last 10 brews)
- Equipment and roaster inventory
- Browse All button for comprehensive view

#### Brew Log View
**Enhanced tracking includes:**
- Date and time
- Coffee bag selection
- Brewer and grinder selection
- Brew method (auto-populated based on brewer)
- Core metrics: dose, water, yield, brew time
- **NEW:** Water temperature tracking
- **NEW:** Grind size tracking
- **NEW:** Auto-calculated brew ratio (water:dose)
- Tasting profile ratings: aroma, flavor, acidity, body, sweetness, aftertaste
- Overall rating and notes

#### Coffee Bag Instance View
**Features:**
- Mark bags as finished/active
- Days since roast with freshness indicators:
  - < 7 days: Peak freshness
  - 7-21 days: Optimal brewing window
  - > 21 days: Past peak freshness
- Statistics: total brews, average rating
- Improved brew history table
- Quick brew log creation

#### Coffee Bag View
**Features:**
- Detailed coffee information
- Statistics: total bags, active bags, total brews, average rating
- Purchase new bag button
- List of all purchased bags with status

#### Equipment View
**Features:**
- Statistics for brewers (total brews, average rating)
- Statistics for grinders (total brews)
- Brew method management (add/remove methods)
- Enhanced notes display

#### Roaster View
**Features:**
- Contact information
- Add coffee type button
- List of all coffee types from this roaster

### 3. Browse All Page
New comprehensive view (`$:/plugins/mblackman/coffee-tracker/ui/all-lists`) with:
- Active coffee bags
- All coffee types
- Equipment (organized by type: brewers, grinders, other)
- All roasters
- Recent 20 brew logs
- Finished coffee bags
- Quick action buttons throughout

### 4. Enhanced Sidebar
- Dashboard link
- Browse All link
- Quick action buttons (Log Brew, New Bag)
- Active coffee bags (top 5)

## Data Model

### Tags Used
- `Roaster` - Coffee roasters
- `CoffeeBag` - Coffee products/types
- `CoffeeBagInstance` - Specific coffee purchases
- `Equipment` - Brewing equipment
- `BrewLog` - Individual brew records
- `Finished` - Marks depleted coffee bags

### Key Fields

**Roaster:**
- roaster-name
- roaster-location
- roaster-website

**CoffeeBag:**
- coffee-name
- roaster (link to Roaster)
- coffee-origin
- coffee-roast-level
- coffee-varietal
- coffee-processing
- coffee-tasting-notes

**CoffeeBagInstance:**
- coffee-bag (link to CoffeeBag)
- purchase-date
- roast-date
- cost
- weight
- my-thoughts

**Equipment:**
- equipment-name
- equipment-type (Brewer, Grinder, Scale, Kettle, Other)
- equipment-manufacturer
- my-notes
- brew-methods (list field for brewers)

**BrewLog:**
- brew-date
- brew-time
- coffee-bag-instance (link)
- brewer (link to Equipment)
- grinder (link to Equipment)
- brew-method
- dose (grams)
- water (grams)
- yield (grams)
- brew-time-seconds
- water-temp (Celsius)
- grind-size
- rating-aroma (0-10)
- rating-flavor (0-10)
- rating-acidity (0-10)
- rating-body (0-10)
- rating-sweetness (0-10)
- rating-aftertaste (0-10)
- overall-rating (0-10)
- notes

## Usage Workflow

### Initial Setup
1. Add your roasters using the "+ Roaster" button
2. Add your equipment (brewers and grinders) using "+ Equipment"
3. For brewers, add supported brew methods in the equipment view
4. Add coffee types using "+ Coffee Type" button
5. Purchase a bag by creating a Coffee Bag Instance

### Daily Brewing
1. From the dashboard, click "☕ Log Brew" on an active bag, OR
2. Use the "+ Log Brew" button in the action toolbar
3. Select your coffee, brewer, grinder, and method
4. Fill in brew metrics (dose, water, temperature, grind size)
5. After brewing, rate the sensory characteristics
6. Add notes about the brew

### Managing Inventory
- Mark bags as "Finished" when depleted
- Track days since roast for optimal freshness
- View statistics per bag, coffee type, and equipment

## Calculated Features

### Brew Ratio
Automatically calculated as water ÷ dose (e.g., 1:16 means 16g water per 1g coffee)

### Freshness Indicators
Days since roast automatically calculated and categorized:
- Green: < 7 days (peak)
- Yellow: 7-21 days (optimal)
- Red: > 21 days (past peak)

### Statistics
- Total brews per coffee bag instance
- Average ratings per coffee type
- Equipment usage statistics
- Total brews across all equipment

## File Structure

```
src/coffee-tracker/
├── configs/
│   ├── config.tid
│   └── configs.multids
├── modals/
│   ├── brew-log-modal.tid
│   ├── coffee-bag-instance-modal.tid
│   ├── coffee-bag-modal.tid
│   ├── equipment-modal.tid
│   └── roaster-modal.tid
├── ui/
│   ├── all-lists.tid
│   ├── brew-log-view.tid
│   ├── coffee-bag-instance-view.tid
│   ├── coffee-bag-view.tid
│   ├── dashboard.tid
│   ├── equipment-view.tid
│   ├── roaster-view.tid
│   └── sidebar-tab.tid
├── index.css
├── index.css.meta
├── plugin.info
├── readme.tid
└── tree.tid
```

## Next Steps & Future Enhancements

### Suggested Next Features:
1. **Data Visualization**
   - Rating trends over time
   - Brew method comparison charts
   - Coffee type performance graphs
   - Equipment usage visualization

2. **Advanced Analytics**
   - Correlation between grind size and rating
   - Optimal brew ratios per coffee type
   - Temperature impact analysis
   - Best performing equipment/method combinations

3. **Search & Filter**
   - Advanced filtering by date range, rating, method
   - Search across all brew logs
   - Tag-based organization

4. **Export/Import**
   - CSV export of brew data
   - Backup/restore functionality
   - Share brew recipes

5. **Recipe Management**
   - Save favorite recipes
   - Copy brew parameters from previous logs
   - Recipe templates per coffee type

6. **Enhanced Tracking**
   - TDS (Total Dissolved Solids) measurements
   - Extraction percentage calculations
   - Bloom time tracking
   - Multiple pouring phases

## Testing the Plugin

1. Build the plugin from source
2. Install in your TiddlyWiki
3. Navigate to the Coffee tab in the sidebar
4. Start by adding a roaster
5. Add equipment
6. Add a coffee type
7. Purchase a bag (create instance)
8. Log your first brew!

## Support

For issues or feature requests, visit the GitHub repository.
