'use strict';

describe('Angular Gridster Spec:', function() {

	beforeEach(module('gridster'));

	var scope, $controller, $compile, $timeout, GridsterCtrl, items, element;

	beforeEach(inject(function($rootScope, _$controller_, _$compile_, _$timeout_) {

		scope = $rootScope.$new();
		$controller = _$controller_;
		$compile = _$compile_;
		$timeout = _$timeout_;

		items = {};
		items['1x1'] = {
			sizeX: 1,
			sizeY: 1,
			id: '1x1'
		};
		items['2x1'] = {
			sizeX: 2,
			sizeY: 1,
			id: '2x1'
		};
		items['2x2'] = {
			sizeX: 2,
			sizeY: 2,
			id: '2x2'
		};
		items['1x2'] = {
			sizeX: 1,
			sizeY: 2,
			id: '1x2'
		};


		scope.items = [];

		for (var k in items) {
			scope.items.push(items[k]);
		}
	}));


	describe('[default]', function () {
		beforeEach(function() {
			element = angular.element('<div gridster><ul><li gridster-item ng-repeat="item in items">{{ item.id }}</li></ul></div>');

			$compile(element)(scope);
			scope.$digest();

			GridsterCtrl = element.controller('gridster');
		});


		describe('initialization', function () {
			it('should add a class of gridster', function(){
				expect(element.hasClass('gridster')).toBe(true);
			});

			it('should have a grid Array', function () {
				expect(GridsterCtrl.grid.constructor).toBe(Array);
			});

			it('should add classes to items', function(){
				expect(element.find('li:eq(0)').hasClass('gridster-item')).toBe(true);
				expect(element.find('li:eq(0)').hasClass('gridster-item-moving')).toBe(true);
				$timeout.flush();
				expect(element.find('li:eq(0)').hasClass('gridster-item-moving')).toBe(false);
			});

			it('should set "item" as itemKey if not specified', function(){
				var GridsterItemCtrl = element.find('li:eq(0)').controller('gridsterItem');

				expect(GridsterItemCtrl.itemKey).toEqual('item');
			});

			it('should render items into grid', function(){
				expect(element.find('li').length).toEqual(4);
			});
		});

		//describe('config', function () {

			//it('should be able to set config', function () {
				//GridsterCtrl.setOptions({
					//width: 1200,
					//colWidth: 120,
					//rowHeight: 120,
					//maxGridRows: 500,
					//columns: 7,
					//minColumns: 3,
					//maxColumns: 3,
					//margins: [15, 15],
					//minRows: 1,
					//maxRows: 500
				//});

				//expect(GridsterCtrl.config.width).toBe(1200);
				//expect(GridsterCtrl.config.colWidth).toBe(120);
				//expect(GridsterCtrl.config.rowHeight).toBe(120);
				//expect(GridsterCtrl.config.maxGridRows).toBe(500);
				//expect(GridsterCtrl.config.columns).toBe(7);
				//expect(GridsterCtrl.config.minColumns).toEqual(3);
				//expect(GridsterCtrl.config.maxColumns).toEqual(3);
				//expect(GridsterCtrl.config.margins).toEqual([15, 15]);
				//expect(GridsterCtrl.config.minRows).toBe(1);
				//expect(GridsterCtrl.config.maxRows).toBe(500);
			//});

			//describe('Width option', function () {

				//it('should set to page width if "auto" & divide columns evenly', function () {
					//element.css('width', '800px');

					//GridsterCtrl.setOptions({
						//columns: 4,
						//margins: [10, 10],
						//width: 'auto',
						//colWidth: 'auto'
					//});

					//expect(GridsterCtrl.config.width).toBe(800);
					//expect(GridsterCtrl.config.colWidth).toBe(197.5);
					//console.log(scope.items);
				//});

				//it('should set the value if integer"', function () {
					//GridsterCtrl.setOptions({
						//width: 1000
					//});

					//expect(GridsterCtrl.config.width).toBe(1000);
				//});
			//});

			//describe('ColWidth option', function () {
				//it('should set the value if equal to "auto"', function () {
					//GridsterCtrl.setOptions({
						//columns: 6,
						//margins: [0, 0],
						//width: 1200,
						//colWidth: 'auto'
					//});

					//expect(GridsterCtrl.config.colWidth).toBe(200);
				//});

				//it('should set the value if integer"', function () {
					//GridsterCtrl.setOptions({
						//colWidth: 100
					//});

					//expect(GridsterCtrl.config.colWidth).toBe(100);
				//});
			//});

			//describe('RowHeight option', function () {
				//it('should set the value if equal to "match"', function () {
					//GridsterCtrl.setOptions({
						//columns: 6,
						//margins: [0, 0],
						//width: 1200,
						//colWidth: 'auto',
						//rowHeight: 'match'
					//});

					//expect(GridsterCtrl.config.rowHeight).toBe(200);
				//});

				//it('should set the value if integer"', function () {
					//GridsterCtrl.setOptions({
						//rowHeight: 100
					//});

					//expect(GridsterCtrl.config.rowHeight).toBe(100);
				//});
			//});
		//});

		describe('Scope changes', function() {
			it('should add item to grid if added through scope', function () {
				expect(element.find('li').length).toBe(4);
				scope.items.push({sizeX: 3, sizeY: 3, id: '3x3'});
				scope.$apply();
				expect(element.find('li').length).toBe(5);
			});

			it('should remove item from grid if removed through scope', function () {
				expect(element.find('li').length).toBe(4);
				scope.items.splice(3, 1);
				scope.$apply();
				expect(element.find('li').length).toBe(3);
			});
		});

	});

	describe('custom grid', function () {
		beforeEach(function() {
			scope.config = {
				colWidth: 100,
				rowHeight: 100,
				columns: 8,
				margins: [5, 5],
				defaultHeight: 1,
				defaultWidth: 2,
				minRows: 3,
				maxRows: 100,
				mobileBreakPoint: 600
			};

			element = angular.element('<div gridster="config"><ul><li gridster-item ng-repeat="item in items">{{ item.id }}</li></ul></div>');

			$compile(element)(scope);
			scope.$digest();

			GridsterCtrl = element.controller('gridster');

		});

		describe('initialization', function() {

			it('should override default config', function(){
				expect(GridsterCtrl.config.columns).toEqual(8);
				expect(GridsterCtrl.config.margins).toEqual([5, 5]);
			});
		});

	});

	describe('GridsterCtrl', function () {
		beforeEach(function() {
			GridsterCtrl.grid = [];
		});

		describe('putItem', function () {
			it('should be able to place an item with coordinates', function () {
				GridsterCtrl.putItem(items['1x1'], 2, 3);
				expect(GridsterCtrl.getItem(2, 3)).toBe(items['1x1']);
			});

			it('should place an item without coordinates into empty grid', function () {
				GridsterCtrl.putItem(items['1x1']);
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);
			});

			it('should place item into without coordinates into the next available position', function () {
				// place 1x1 at 0x0
				GridsterCtrl.putItem(items['1x1']);
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);

				// place 2x1 at 0x2
				items['2x1'].row = 0;
				items['2x1'].col = 2;
				GridsterCtrl.putItem(items['2x1']);
				expect(GridsterCtrl.getItem(0, 2).id).toBe(items['2x1'].id);

				// place 1x2 in without coordinates
				GridsterCtrl.putItem(items['1x2']);
				expect(GridsterCtrl.getItem(0, 1).id).toBe(items['1x2'].id); // should stick it at 0x1

				// place 2x2 without coordinates
				GridsterCtrl.putItem(items['2x2']);
				expect(GridsterCtrl.getItem(0, 4).id).toBe(items['2x2'].id); // should stick it at 0x4
			});

			it('should not allow items to be placed with negative indices', function () {
				GridsterCtrl.putItem(items['1x1'], -1, -1);
				expect(GridsterCtrl.getItem(0, 0)).toBe(items['1x1']);
				expect(items['1x1'].row).toBe(0);
				expect(items['1x1'].col).toBe(0);
			});

			it('should not float items until told to', function () {
				expect(GridsterCtrl.getItem(3, 0)).toBe(null);
				GridsterCtrl.putItem(items['1x1'], 3, 0);
				expect(GridsterCtrl.getItem(3, 0).id).toBe(items['1x1'].id);
			});

			it('should not create two references to the same item', function () {
				GridsterCtrl.putItem(items['1x1'], 0, 0);
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);
				GridsterCtrl.putItem(items['1x1'], 0, 4);
				expect(GridsterCtrl.getItem(0, 0)).toBe(null);
				expect(GridsterCtrl.getItem(0, 4).id).toBe(items['1x1'].id);
			});
		});

		describe('getItem', function () {
			it('should match any column of a multi-column item', function () {
				GridsterCtrl.putItem(items['2x2'], 0, 2);

				// all 4 corners should return the same item
				expect(GridsterCtrl.getItem(0, 2)).toBe(items['2x2']);
				expect(GridsterCtrl.getItem(1, 2)).toBe(items['2x2']);
				expect(GridsterCtrl.getItem(0, 3)).toBe(items['2x2']);
				expect(GridsterCtrl.getItem(1, 3)).toBe(items['2x2']);
			});
		});

		describe('getItems', function () {
			it('should get items within an area', function () {
				GridsterCtrl.putItem(items['2x2'], 0, 1);
				GridsterCtrl.putItem(items['2x1'], 2, 0);

				// verify they are still where we put them
				expect(GridsterCtrl.getItem(0, 1).id).toBe(items['2x2'].id);
				expect(GridsterCtrl.getItem(2, 0).id).toBe(items['2x1'].id);

				var _items = GridsterCtrl.getItems(1, 0, 2, 1);
				expect(_items.length).toBe(1);
				expect(_items[0].id).toBe(items['2x2'].id);
			});
		});

		describe('floatItemsUp', function () {
			it('should float an item up', function () {
				GridsterCtrl.putItem(items['1x1'], 3, 0);
				GridsterCtrl.floatItemsUp();
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);
			});

			it('should stack items when they float up', function () {
				GridsterCtrl.putItem(items['1x1'], 3, 0);
				GridsterCtrl.floatItemsUp();
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);

				GridsterCtrl.putItem(items['2x1'], 3, 0);
				GridsterCtrl.floatItemsUp();
				expect(GridsterCtrl.getItem(1, 0).id).toBe(items['2x1'].id);

				GridsterCtrl.putItem(items['1x1'], 3, 1);
				GridsterCtrl.floatItemsUp();
				expect(GridsterCtrl.getItem(1, 1).id).toBe(items['1x1'].id);
			});

			it('should correctly stack multi-column items when their primary coordinates do not stack', function () {
				GridsterCtrl.putItem(items['2x2'], 0, 2);
				GridsterCtrl.putItem(items['2x1'], 2, 1);

				// verify they are still where we put them
				expect(GridsterCtrl.getItem(0, 2).id).toBe(items['2x2'].id);
				expect(GridsterCtrl.getItem(2, 1).id).toBe(items['2x1'].id);

				// allow them to float up
				GridsterCtrl.floatItemsUp();

				// verify they are still where we put them
				expect(GridsterCtrl.getItem(0, 2).id).toBe(items['2x2'].id);
				expect(GridsterCtrl.getItem(2, 1).id).toBe(items['2x1'].id);
			});
		});

		describe('moveOverlappingItems', function () {
			it('should correctly stack items on resize when their primary coordinates do not stack', function () {
				GridsterCtrl.putItem(items['1x1'], 0, 0);
				GridsterCtrl.putItem(items['2x2'], 0, 2);
				GridsterCtrl.putItem(items['2x1'], 1, 0);

				// verify they are still where we put them
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);
				expect(GridsterCtrl.getItem(0, 2).id).toBe(items['2x2'].id);
				expect(GridsterCtrl.getItem(1, 0).id).toBe(items['2x1'].id);

				items['2x1'].sizeX = 3;
				GridsterCtrl.moveOverlappingItems(items['2x1']);
				expect(GridsterCtrl.getItem(1, 2).id).toBe(items['2x1'].id);

				expect(items['2x2'].row).toBe(2);
			});

			it('should correctly push items down', function () {
				GridsterCtrl.putItem(items['2x2'], 0, 0);
				GridsterCtrl.putItem(items['1x1'], 2, 0);
				GridsterCtrl.putItem(items['1x2'], 1, 1);
				GridsterCtrl.floatItemsUp();

				// verify they are still where we put them
				expect(GridsterCtrl.getItem(2, 0).id).toBe(items['2x2'].id);
				expect(GridsterCtrl.getItem(0, 0).id).toBe(items['1x1'].id);
				expect(GridsterCtrl.getItem(0, 1).id).toBe(items['1x2'].id);
			});
		});


	});




});
