'use strict';

angular.module('gridster', [])

.constant('gridsterConfig', {
	columns: 6, // number of columns in the grid
	width: 'auto', // the width of the grid. "auto" will expand the grid to its parent container
	colWidth: 'auto', // the width of the columns. "auto" will divide the width of the grid evenly among the columns
	rowHeight: 'match', // the height of the rows. "match" will set the row height to be the same as the column width
	margins: [10, 10], // the margins in between grid items
	isMobile: false, // toggle mobile view
	minColumns: 1, // the minimum amount of columns the grid can scale down to
	minRows: 1, // the minimum amount of rows to show if the grid is empty
	maxRows: 100, // the maximum amount of rows in the grid
	defaultSizeX: 2, // the default width of a item
	defaultSizeY: 1, // the default height of a item
	mobileBreakPoint: 600, // the width threshold to toggle mobile mode
	resizable: { // options to pass to jquery ui resizable
		enabled: true
	},
	draggable: { // options to pass to jquery ui draggable
		enabled: true
	}
})

.controller('GridsterCtrl', ['$scope', '$attrs', '$document', '$timeout', 'gridsterConfig', function ($scope, $attrs, $document, $timeout, gridsterConfig) {
	var self = this;

	/**
	 * A positional array containing the items in the grid
	 */
	this.grid = [];

	/**
	 * Preview holder element
	 */
	this.$preview = null;

	/**
	 * Gridster element
	 */
	this.$element = null;

	/**
	 * Create config property from gridsterConfig constant
	 */
	this.config = angular.extend({}, gridsterConfig);

	/**
	 * Initialize the directive
	 *
	 * @param {object} $element Gridster element
	 * @param {object} $preview Gridster preview element
	 */
	this.init = function ($element, $preview) {
		self.$element = $element;
		self.$preview = $preview;

		self.$element.addClass('gridster');

		self.resolveConfig();

		// watch and override config with user provided config
		$scope.$watch('config', function(newConfig, oldConfig) {
			if (newConfig &&  newConfig !== oldConfig) {
				self.resolveConfig();

				// if draggable/resizable config has changed, we need to inform our gridsterItem directives
				if (typeof oldConfig.draggable !== 'undefined' && typeof oldConfig.draggable !== 'undefined' && newConfig.draggable !== oldConfig.draggable) {
					$scope.$broadcast('draggable-changed', oldConfig.draggable);
				}
				if (typeof oldConfig.resizable !== 'undefined' && typeof oldConfig.resizable !== 'undefined' && newConfig.resizable !== oldConfig.resizable) {
					$scope.$broadcast('resizable-changed', oldConfig.resizable);
				}
			}
		}, true);

		$scope.$watch(function() {
			return self.config.isMobile;
		}, function (isMobile) {
			if (isMobile) {
				self.$element.addClass('gridster-mobile');
			} else {
				self.$element.removeClass('gridster-mobile');
			}
		});

		var originalWidth = self.$element.width();

		angular.element(window).on('resize', function () {
			var width = $element.width();
			if (width === originalWidth || self.$element.find('.gridster-item-moving').length > 0) {
				return;
			}

			// width has changed so we need to recalculate config
			self.resolveConfig();

			originalWidth = width;

			$scope.$broadcast('gridster-resized', [width, self.$element.height()]);

			$scope.$apply();
		});

		$scope.$on('$destroy', function () {
			try {
				self.destroy();
			} catch (e) {}
		});
	};

	/**
	 * Resolve "auto" & "match" config values to their numerical equivalent
	 */
	this.resolveConfig = function() {
		$.extend(true, self.config, $scope.config);

		if (self.config.width === 'auto') {
			self.config._width = self.$element.width();
		} else {
			self.config._width = self.config.width;
		}
		if (self.config.colWidth === 'auto') {
			self.config._colWidth = (self.config._width - self.config.margins[1]) / self.config.columns;
		} else {
			self.config._colWidth = self.config.colWidth;
		}
		if (self.config.rowHeight === 'match') {
			self.config._rowHeight = self.config._colWidth;
		} else {
			self.config._rowHeight = self.config.rowHeight;
		}

		self.redraw();
	};


	/**
	 * Clean up after yourself
	 */
	this.destroy = function () {
		self.$preview.remove();
		self.config = self.config.margins = self.grid = self.$element = self.$preview = null;
	};

	/**
	 * Redraws the grid and updates the grid height
	 */
	this.redraw = function () {
		self.$element.removeClass('gridster-loaded');

		self.config.isMobile = self.config._width <= self.config.mobileBreakPoint;

		// loop through all items and reset their CSS
		for (var rowIndex = 0, l = self.grid.length; rowIndex < l; ++rowIndex) {
			var columns = self.grid[rowIndex];
			if (!columns) {
				continue;
			}
			for (var colIndex = 0, len = columns.length; colIndex < len; ++colIndex) {
				if (columns[colIndex]) {
					var item = columns[colIndex];
					var $el = item.$element;
					self.setElementPosition($el, item.row, item.col);
					self.setElementSizeY($el, item.sizeY);
					self.setElementSizeX($el, item.sizeX);
				}
			}
		}

		self.floatItemsUp();
		self.updateHeight();

		self.$element.addClass('gridster-loaded');
	};

	/**
	 * Check if item can occupy a specified position in the grid
	 *
	 * @param {object} item The item in question
	 * @param {number} row The row index
	 * @param {number} column The column index
	 * @returns {boolean} True if if item fits
	 */
	this.canItemOccupy = function (item, row, column) {
		return row > -1 && column > -1 && item.sizeX + column <= self.config.columns;
	};

	/**
	 * Set the item in the first suitable position
	 *
	 * @param {object} item The item to insert
	 */
	this.autoSetItemPosition = function (item) {
		// walk through each row and column looking for a place it will fit
		for (var rowIndex = 0; rowIndex < self.config.maxRows; ++rowIndex) {
			for (var colIndex = 0; colIndex < self.config.columns; ++colIndex) {
				// only insert if position is not already taken and it can fit
				if (!self.getItem(rowIndex, colIndex) && self.canItemOccupy(item, rowIndex, colIndex)) {
					self.putItem(item, rowIndex, colIndex);
					return;
				}
			}
		}
		throw new Error('Unable to place item!');
	};

	/**
	 * Gets items at a specific coordinate
	 *
	 * @param {number} row
	 * @param {number} column
	 * @param {number} sizeX
	 * @param {number} sizeY
	 * @param {array} excludeItems An array of items to exclude from selection
	 * @returns {array} Items that match the criteria
	 */
	this.getItems = function (row, column, sizeX, sizeY, excludeItems) {
		var items = [];
		if (!sizeX || !sizeY) {
			sizeX = sizeY = 1;
		}
		if (excludeItems && !(excludeItems instanceof Array)) {
			excludeItems = [excludeItems];
		}
		for (var h = 0; h < sizeY; ++h) {
			for (var w = 0; w < sizeX; ++w) {
				var item = self.getItem(row + h, column + w, excludeItems);
				if (item && (!excludeItems || excludeItems.indexOf(item) === -1) && items.indexOf(item) === -1) {
					items.push(item);
				}
			}
		}

		return items;
	};

	/**
	 * Removes an item from the grid
	 * Floats any items from below up and updates the height of the grid
	 *
	 * @param {object} item
	 */
	this.removeItem = function (item) {
		for (var rowIndex = 0, l = self.grid.length; rowIndex < l; ++rowIndex) {
			var columns = self.grid[rowIndex];
			if (!columns) {
				continue;
			}
			var index = columns.indexOf(item);
			if (index !== -1) {
				columns[index] = null;
				break;
			}
		}
		self.floatItemsUp();
		self.updateHeight();
	};

	/**
	 * Returns the item at a specified coordinate
	 *
	 * @param {number} row
	 * @param {number} column
	 * @param {array} excludeitems Items to exclude from selection
	 * @returns {object} The matched item or null
	 */
	this.getItem = function (row, column, excludeItems) {
		if (excludeItems && !(excludeItems instanceof Array)) {
			excludeItems = [excludeItems];
		}
		var sizeY = 1;
		while (row > -1) {
			var sizeX = 1,
				col = column;
			while (col > -1) {
				var items = self.grid[row];
				if (items) {
					var item = items[col];
					if (item && (!excludeItems || excludeItems.indexOf(item) === -1) && item.sizeX >= sizeX && item.sizeY >= sizeY) {
						return item;
					}
				}
				++sizeX;
				--col;
			}
			--row;
			++sizeY;
		}

		return null;
	};

	/**
	 * Insert an array of items into the grid
	 *
	 * @param {array} items An array of items to insert
	 */
	this.putItems = function (items) {
		for (var i = 0, l = items.length; i < l; ++i) {
			self.putItem(items[i]);
		}
	};

	/**
	 * Insert a single item into the grid
	 *
	 * @param {object} item The item to insert
	 * @param {number} row (Optional) Specifies the items row index
	 * @param {number} column (Optional) Specifies the items column index
	 */
	this.putItem = function (item, row, column) {
		// use the items position if row is not provided
		if (typeof row === 'undefined' || row === null) {
			row = item.row;
			column = item.col;

			// autoset the item if position is still undefined
			if (typeof row === 'undefined' || row === null) {
				self.autoSetItemPosition(item);
				return;
			}
		}

		//
		if (!self.canItemOccupy(item, row, column)) {
			column = Math.min(self.config.columns - item.sizeX, Math.max(0, column));
			row = Math.max(0, row);
		}

		if (item && item.oldRow !== null && typeof item.oldRow !== 'undefined') {
			if (item.oldRow === row && item.oldColumn === column) {
				item.row = row;
				item.col = column;
				return;
			} else {
				// remove from old position
				var oldRow = self.grid[item.oldRow];
				if (oldRow && oldRow[item.oldColumn] === item) {
					delete oldRow[item.oldColumn];
				}
			}
		}

		item.oldRow = item.row = row;
		item.oldColumn = item.col = column;

		self.moveOverlappingItems(item);

		if (!self.grid[row]) {
			self.grid[row] = [];
		}
		self.grid[row][column] = item;
	};

	/**
	 * Prevents items from being overlapped
	 *
	 * @param {object} item The item that should remain
	 */
	this.moveOverlappingItems = function (item) {
		var items = self.getItems(item.row, item.col, item.sizeX, item.sizeY, item);

		self.moveItemsDown(items, item.row + item.sizeY);
	};

	/**
	 * Moves an array of items to a specified row
	 *
	 * @param {array} items The items to move
	 * @param {number} row The target row
	 */
	this.moveItemsDown = function (items, row) {
		if (!items || items.length === 0) {
			return;
		}
		var topRows = {},
			item, i, l;
		// calculate the top rows in each column
		for (i = 0, l = items.length; i < l; ++i) {
			item = items[i];
			var topRow = topRows[item.col];
			if (typeof topRow === 'undefined' || item.row < topRow) {
				topRows[item.col] = item.row;
			}
		}
		// move each item down from the top row in its column to the row
		for (i = 0, l = items.length; i < l; ++i) {
			item = items[i];
			var columnOffset = row - topRows[item.col];
			self.putItem(item, item.row + columnOffset, item.col);
		}
	};

	/**
	 * Moves all items up as much as possible
	 */
	this.floatItemsUp = function () {
		for (var rowIndex = 0, l = self.grid.length; rowIndex < l; ++rowIndex) {
			var columns = self.grid[rowIndex];
			if (!columns) {
				continue;
			}
			for (var colIndex = 0, len = columns.length; colIndex < len; ++colIndex) {
				if (columns[colIndex]) {
					self.floatItemUp(columns[colIndex]);
				}
			}
		}
	};

	/**
	 * Float an item up to the most suitable row
	 *
	 * @param {object} item The item to move
	 */
	this.floatItemUp = function (item) {
		var colIndex = item.col,
			sizeY = item.sizeY,
			sizeX = item.sizeX,
			bestRow = null,
			bestColumn = null,
			rowIndex = item.row - 1;

		while (rowIndex > -1) {
			var items = self.getItems(rowIndex, colIndex, sizeX, sizeY, item);
			if (items.length !== 0) {
				break;
			}
			bestRow = rowIndex;
			bestColumn = colIndex;
			--rowIndex;
		}
		if (bestRow !== null) {
			self.putItem(item, bestRow, bestColumn);
		}
	};

	/**
	 * Update gridsters height
	 *
	 * @param {number} plus (Optional) Additional height to add
	 */
	this.updateHeight = function (plus) {
		var maxHeight = self.config.minRows;
		if (!plus) {
			plus = 0;
		}
		for (var rowIndex = self.grid.length; rowIndex >= 0; --rowIndex) {
			var columns = self.grid[rowIndex];
			if (!columns) {
				continue;
			}
			for (var colIndex = 0, len = columns.length; colIndex < len; ++colIndex) {
				if (columns[colIndex]) {
					maxHeight = Math.max(maxHeight, rowIndex + plus + columns[colIndex].sizeY);
				}
			}
		}
		var gridHeight = Math.min(self.config.maxRows, maxHeight);

		if (self.config.isMobile) {
			self.$element.css('height', '100%');
		} else {
			self.$element.css('height', (gridHeight * self.config._rowHeight) + self.config.margins[0] + 'px');
		}
	};

	/**
	 * Returns the number of rows that will fit in given amount of pixels
	 *
	 * @param {number} pixels
	 * @param {boolean} ceilOrFloor (Optional) Determines rounding method
	 */
	this.pixelsToRows = function (pixels, ceilOrFloor) {
		if (ceilOrFloor === true) {
			return Math.ceil(pixels / self.config._rowHeight);
		} else if (ceilOrFloor === false) {
			return Math.floor(pixels / self.config._rowHeight);
		}

		return Math.round(pixels / self.config._rowHeight);
	};

	/**
	 * Returns the number of columns that will fit in a given amount of pixels
	 *
	 * @param {number} pixels
	 * @param {boolean} ceilOrFloor (Optional) Determines rounding method
	 * @returns {number} The number of columns
	 */
	this.pixelsToColumns = function (pixels, ceilOrFloor) {
		if (ceilOrFloor === true) {
			return Math.ceil(pixels / self.config._colWidth);
		} else if (ceilOrFloor === false) {
			return Math.floor(pixels / self.config._colWidth);
		}

		return Math.round(pixels / self.config._colWidth);
	};

	/**
	 * Sets an elements position on the page
	 *
	 * @param {object} $el The element to position
	 * @param {number} row
	 * @param {number} column
	 */
	this.setElementPosition = function ($el, row, column) {
		if (self.config.isMobile) {
			$el.css({
				margin: self.config.margins[0] + 'px',
				top: 'auto',
				left: 'auto'
			});
		} else {
			$el.css({
				margin: 0,
				top: row * self.config._rowHeight + self.config.margins[0],
				left: column * self.config._colWidth + self.config.margins[1]
			});
		}
	};

	/**
	 * Sets an elements height
	 *
	 * @param {object} $el The element to resize
	 * @param {number} rows The number of rows the element occupies
	 */
	this.setElementSizeY = function ($el, rows) {
		if (self.config.isMobile) {
			$el.css('height', 'auto');
		} else {
			$el.css('height', (rows * self.config._rowHeight) - self.config.margins[0] + 'px');
		}
	};

	/**
	 * Sets an elements width
	 *
	 * @param {object} $el The element to resize
	 * @param {number} columns The number of columns the element occupies
	 */
	this.setElementSizeX = function ($el, columns) {
		if (self.config.isMobile) {
			$el.css('width', 'auto');
		} else {
			$el.css('width', (columns * self.config._colWidth) - self.config.margins[1] + 'px');
		}
	};
}])

/**
 * The gridster directive
 *
 * @param {object} $parse
 * @param {object} $timeout
 */
.directive('gridster', [function () {
	return {
		restrict: 'EA',
		controller: 'GridsterCtrl',
		scope: {
			config: '=?gridster'
		},
		compile: function() {
			return {
				pre: function (scope, $elem, attrs, controller) {
					var $preview = angular.element('<div class="gridster-item gridster-preview-holder"></div>').appendTo($elem);

					controller.init($elem, $preview);
				}
			};
		}
	};
}])

.controller('GridsterItemCtrl', ['$scope', '$parse', '$attrs', '$timeout', function ($scope, $parse, $attrs, $timeout) {
	var self = this;

	this.init = function($element, GridsterCtrl) {
		$element.addClass('gridster-item');
		$element.addClass('gridster-item-moving');

		self.itemKey = $attrs.gridsterItem || 'item';

		var $itemGetter = $parse(self.itemKey);
		var $itemSetter = $itemGetter.assign;

		self.item = angular.extend({}, $itemGetter($scope));

		//if (!options && $optionsGetter.assign) {
			//options = {
				//row: item.row,
				//col: item.col,
				//sizeX: item.sizeX,
				//sizeY: item.sizeY
			//};
			//$optionsGetter.assign(scope, options);
		//}

		//var aspects = ['sizeX', 'sizeY', 'row', 'col'],
			//$getters = {};

		//var aspectFn = function (aspect) {
			//var key;
			//if (typeof item[aspect] === 'string') {
				//key = item[aspect];
			//} else if (typeof options[aspect.toLowerCase()] === 'string') {
				//key = options[aspect.toLowerCase()];
			//} else if (optionsKey) {
				//key = $parse(optionsKey + '.' + aspect);
			//} else {
				//return;
			//}
			//$getters[aspect] = $parse(key);
			//scope.$watch(key, function (newVal) {
				//newVal = parseInt(newVal, 10);
				//if (!isNaN(newVal)) {
					//item[aspect] = newVal;
				//}
			//});
			//var val = $getters[aspect]($scope);
			//if (typeof val === 'number') {
				//self.item[aspect] = val;
			//}
		//};

		//for (var i = 0, l = aspects.length; i < l; ++i) {
			//aspectFn(aspects[i]);
		//}


		//self.item = $scope[self.itemKey];
		self.item.sizeX = self.item.sizeX || GridsterCtrl.config.defaultSizeX;
		self.item.sizeY = self.item.sizeY || GridsterCtrl.config.defaultSizeY;
		self.item.$element = $element;

		self.dragging = false;
		self.resizing = false;
		self.draggablePossible = typeof $element.draggable === 'function';
		self.resizablePossible = typeof $element.resizable === 'function';
		self.$element = $element;
		self.GridsterCtrl = GridsterCtrl;

		var positionChanged = function() {
			self.setPosition(self.item.row, self.item.col);
		};

		// Update the items position on item changes
		$scope.$watch(self.itemKey + '.row', positionChanged);
		$scope.$watch(self.itemKey + '.col', positionChanged);
		$scope.$watch(self.itemKey + '.sizeX', function(sizeX) {
			self.setSizeX(sizeX);
		});
		$scope.$watch(self.itemKey + '.sizeY', function(sizeY) {
			self.setSizeY(sizeY);
		});

		self.setDraggable(typeof GridsterCtrl.config.draggable !== 'undefined' && typeof GridsterCtrl.config.draggable.enabled !== 'undefined' && GridsterCtrl.config.draggable.enabled);
		self.setResizable(typeof GridsterCtrl.config.resizable !== 'undefined' && typeof GridsterCtrl.config.resizable.enabled !== 'undefined' && GridsterCtrl.config.resizable.enabled);

		$timeout(function () {
			$element.removeClass('gridster-item-moving');
		}, 100);
	};

	$scope.$on('draggable-changed', function (e, draggable) {
		self.setDraggable(draggable.enabled);
	});

	$scope.$on('resizable-changed', function (e, resizable) {
		self.setResizable(resizable.enabled);
	});

	$scope.$on('gridster-resized', function () {
		self.updateResizableDimensions(typeof self.GridsterCtrl.config.resizable !== 'undefined' && typeof self.GridsterCtrl.config.resizable.enabled !== 'undefined' && self.GridsterCtrl.config.resizable.enabled);
	});

	// extra clean up when element is destroyed
	$scope.$on('$destroy', function () {
		try {
			self.GridsterCtrl.removeItem(self.item);
			self.GridsterCtrl = null;
			self.$element.draggable('destroy');
			self.$element.resizable('destroy');
			self.$element = null;
		} catch (e) {}
	});


	/**
	 * Set the items position
	 *
	 * @param {number} row
	 * @param {number} column
	 */
	this.setPosition = function (row, column) {
		self.GridsterCtrl.putItem(self.item, row, column);
		self.GridsterCtrl.floatItemsUp();
		self.GridsterCtrl.updateHeight(self.item.sizeY);

		if (self.dragging) {
			self.GridsterCtrl.setElementPosition(self.GridsterCtrl.$preview, self.item.row, self.item.col);
		} else {
			self.GridsterCtrl.setElementPosition(self.$element, self.item.row, self.item.col);
		}
	};

	/**
	 * Update an items position if necessary
	 */
	this.updateItemPosition = function(item) {
		var hasChanged = false;

		if (self.item.sizeX !== self.item.oldSizeX) {
			hasChanged = true;
		}

		if (self.item.sizeY !== self.item.oldSizeY) {
		   hasChanged = true;
		}

		if (self.item.row !== slelf.item.oldRow || self.item.column !== self.item.oldColumn) {
			hasChanged = true;
		}

		if (hasChanged) {

		}
	};

	/**
	 * Set one of the items size properties
	 *
	 * @param {string} key Can be either "x" or "y"
	 * @param {number} value The size amount
	 */
	this.setSize = function (key, value) {
		if (value === '') {
			return;
		}
		value = parseInt(value, 10);

		key = key.toUpperCase();

		var camelCase = 'size' + key;
		var	titleCase = 'Size' + key;

		if (isNaN(value) || value === 0) {
			value = self.GridsterCtrl.config['default' + titleCase];
		}
		self.item['old' + titleCase] = self.item[camelCase] = value;

		if (self.resizing) {
			self.GridsterCtrl.setElementPosition(self.GridsterCtrl.$preview, self.item.row, self.item.col);
			self.GridsterCtrl['setElement' + titleCase](self.GridsterCtrl.$preview, value);
		} else {
			self.GridsterCtrl['setElement' + titleCase](self.$element, value);
		}

		var changed = !(self.item[camelCase] === value && self.item['old' + titleCase] && self.item['old' + titleCase] === value);
		if (changed) {
			self.GridsterCtrl.moveOverlappingItems(self.item);
			self.GridsterCtrl.floatItemsUp();
			self.GridsterCtrl.updateHeight(self.item.sizeY);
		}
	};

	/**
	 * Sets the items sizeY property
	 *
	 * @param {number} rows
	 */
	this.setSizeY =  function (rows) {
		self.setSize('y', rows);
	};

	/**
	 * Sets the items sizeX property
	 *
	 * @param {number} rows
	 */
	this.setSizeX = function (columns) {
		self.setSize('x', columns);
	};

	this.setDraggable = function(enable) {
		if (self.draggablePossible) {
			if (enable) {
				self.$element.draggable({
					handle: self.GridsterCtrl.config.draggable && self.GridsterCtrl.config.draggable.handle ? self.GridsterCtrl.config.draggable.handle : null,
					refreshPositions: true,
					start: function (e, item) {
						self.$element.addClass('gridster-item-moving');
						self.dragging = true;
						self.GridsterCtrl.$preview.fadeIn(300);
						self.GridsterCtrl.setElementSizeX(self.GridsterCtrl.$preview, self.item.sizeX);
						self.GridsterCtrl.setElementSizeY(self.GridsterCtrl.$preview, self.item.sizeY);
						self.GridsterCtrl.setElementPosition(self.GridsterCtrl.$preview, self.item.row, self.item.col);
						self.GridsterCtrl.updateHeight(self.item.sizeY);

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.draggable && self.GridsterCtrl.config.draggable.start) {
								self.GridsterCtrl.config.draggable.start(e, item, self.$element);
							}
						});
					},
					drag: function (e, item) {
						self.item.row = self.GridsterCtrl.pixelsToRows(item.position.top);
						self.item.col = self.GridsterCtrl.pixelsToColumns(item.position.left);

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.draggable && self.GridsterCtrl.config.draggable.drag) {
								self.GridsterCtrl.config.draggable.drag(e, item, self.$element);
							}
						});
					},
					stop: function (e, item) {
						self.$element.removeClass('gridster-item-moving');
						self.item.row = self.GridsterCtrl.pixelsToRows(item.position.top);
						self.item.col = self.GridsterCtrl.pixelsToColumns(item.position.left);
						self.dragging = false;
						self.GridsterCtrl.$preview.fadeOut(300);
						self.setPosition(self.item.row, self.item.col);
						self.GridsterCtrl.updateHeight();

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.draggable && self.GridsterCtrl.config.draggable.stop) {
								self.GridsterCtrl.config.draggable.stop(e, item, self.$element);
							}
						});
					}
				});
			} else {
				try {
					self.$element.draggable('destroy');
				} catch (e) {}
			}
		}
	};

	this.setResizable = function(enable) {
		if (self.resizablePossible) {
			if (enable) {
				self.$element.resizable({
					autoHide: true,
					handles: 'n, e, s, w, ne, se, sw, nw',
					minHeight: self.GridsterCtrl.config.minRows * self.GridsterCtrl.config._rowHeight - self.GridsterCtrl.config.margins[0],
					maxHeight: self.GridsterCtrl.config.maxRows * self.GridsterCtrl.config._rowHeight - self.GridsterCtrl.config.margins[0],
					minWidth: self.GridsterCtrl.config.minColumns * self.GridsterCtrl.config._colWidth - self.GridsterCtrl.config.margins[1],
					maxWidth: self.GridsterCtrl.config.columns * self.GridsterCtrl.config._colWidth - self.GridsterCtrl.config.margins[1],
					start: function (e, item) {
						self.$element.addClass('gridster-item-moving');
						self.resizing = true;
						self.GridsterCtrl.$preview.fadeIn(300);
						self.GridsterCtrl.setElementSizeX(self.GridsterCtrl.$preview, self.item.sizeX);
						self.GridsterCtrl.setElementSizeY(self.GridsterCtrl.$preview, self.item.sizeY);

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.resizable && self.GridsterCtrl.config.resizable.start) {
								self.GridsterCtrl.config.resizable.start(e, item, self.$element);
							}
						});
					},
					resize: function (e, item) {
						self.item.row = self.GridsterCtrl.pixelsToRows(item.position.top, false);
						self.item.col = self.GridsterCtrl.pixelsToColumns(item.position.left, false);
						self.item.sizeX = self.GridsterCtrl.pixelsToColumns(item.size.width, true);
						self.item.sizeY = self.GridsterCtrl.pixelsToRows(item.size.height, true);

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.resizable && self.GridsterCtrl.config.resizable.resize) {
								self.GridsterCtrl.config.resizable.resize(e, item, self.$element);
							}
						});
					},
					stop: function (e, item) {
						self.$element.removeClass('gridster-item-moving');
						self.item.row = self.GridsterCtrl.pixelsToRows(item.position.top, false);
						self.item.col = self.GridsterCtrl.pixelsToColumns(item.position.left, false);
						self.item.sizeX = self.GridsterCtrl.pixelsToColumns(item.size.width, true);
						self.item.sizeY = self.GridsterCtrl.pixelsToRows(item.size.height, true);
						self.resizing = false;
						self.GridsterCtrl.$preview.fadeOut(300);
						self.setPosition(self.item.row, self.item.col);
						self.setSizeY(self.item.sizeY);
						self.setSizeX(self.item.sizeX);

						$scope.$apply(function() {
							if (self.GridsterCtrl.config.resizable && self.GridsterCtrl.config.resizable.stop) {
								self.GridsterCtrl.config.resizable.stop(e, item, self.$element);
							}
						});
					}
				});
			} else {
				try {
					self.$element.resizable('destroy');
				} catch (e) {}
			}
		}
	};

	this.updateResizableDimensions = function(enabled) {
		if (self.resizablePossible && enabled) {
			self.$element.resizable('option', 'minHeight', self.GridsterCtrl.config.minRows * self.GridsterCtrl.config._rowHeight - self.GridsterCtrl.config.margins[0]);
			self.$element.resizable('option', 'maxHeight', self.GridsterCtrl.config.maxRows * self.GridsterCtrl.config._rowHeight - self.GridsterCtrl.config.margins[0]);
			self.$element.resizable('option', 'minWidth', self.GridsterCtrl.config.minColumns * self.GridsterCtrl.config._colWidth - self.GridsterCtrl.config.margins[1]);
			self.$element.resizable('option', 'maxWidth', self.GridsterCtrl.config.columns * self.GridsterCtrl.config._colWidth - self.GridsterCtrl.config.margins[1]);
		}
	};

}])

/**
 * GridsterItem directive
 */
.directive('gridsterItem', [function () {
	return {
		restrict: 'EA',
		require: ['^gridster', 'gridsterItem'],
		controller: 'GridsterItemCtrl',
		link: function (scope, $element, attrs, ctrls) {
			var GridsterCtrl = ctrls[0];
			var GridsterItemCtrl = ctrls[1];

			GridsterItemCtrl.init($element, GridsterCtrl);
		}
	};
}])
;
