angular.module('myApp', ['gridster', 'ui.bootstrap'])

.controller('AppCtrl', ['$scope', '$timeout', function ($scope, $timeout) {
	$scope.gridsterOptions = {
		margins: [20, 20],
		columns: 4
	};

	$scope.dashboards = {
		'1': {
			id: '1',
			name: 'Home',
			widgets: [{
				col: 0,
				row: 0,
				sizeY: 1,
				sizeX: 1,
				name: "Widget 1"
			}, {
				col: 2,
				row: 1,
				sizeY: 1,
				sizeX: 1,
				name: "Widget 2"
			}]
		},
		'2': {
			id: '2',
			name: 'Other',
			widgets: [{
				col: "1",
				row: "1",
				sizeY: "1",
				sizeX: 2,
				name: "Other Widget 1"
			}, {
				col: "1",
				row: 3,
				sizeY: "1",
				sizeX: "1",
				name: "Other Widget 2"
			}]
		}
	};

	$scope.clear = function () {
		$scope.gridster.remove_all_widgets();
	};

	$scope.addWidget = function () {
		$scope.gridster.addWidget({
			name: "New Widget",
			sizeX: 1,
			sizeY: 1
		});
	};

	$scope.$watch('selectedDashboardId', function (newVal, oldVal) {
		if (newVal !== oldVal) {
			$scope.dashboard = $scope.dashboards[newVal];
		} else {
			$scope.dashboard = $scope.dashboards[1];
		}
	});

	// init dashboard
	$scope.selectedDashboardId = '1';

}])

.controller('CustomWidgetCtrl', ['$scope', '$modal',
	function ($scope, $modal) {

		var item = angular.extend({}, $scope.widget); // need new object to prevent auto update

		$scope.form = {
			row: item.row,
			col: item.col,
			sizeX: item.sizeX,
			sizeY: item.sizeY,
		}

		$scope.remove = function (item) {
			$scope.dashboard.widgets.splice($scope.dashboard.widgets.indexOf(item), 1);
		};

		$scope.update = function (item) {
			angular.extend(item, $scope.form);
		};

		$scope.openSettings = function (e, widget, index) {
			$modal.open({
				scope: $scope,
				templateUrl: 'widget_settings.html',
				controller: 'WidgetSettingsCtrl',
				resolve: {
					$widget: function () {
						return $(e.currentTarget).parents('.gs-w');
					},
					widget: function () {
						return widget;
					},
					index: function () {
						return index;
					}
				}
			});
		};

		$scope.removeWidget = function (e) {
			$scope.gridster.remove_widget($(e.currentTarget).parents('.gs-w'));
		};

	}
])

.controller('WidgetSettingsCtrl', ['$scope', '$timeout', '$rootScope', '$modalInstance', '$widget', 'widget', 'index',
	function ($scope, $timeout, $rootScope, $modalInstance, $widget, widget, index) {
		$scope.widget = widget;

		$scope.form = {
			name: widget.name,
			sizeX: widget.sizeX,
			sizeY: widget.sizeY,
			col: widget.col,
			row: widget.row
		};

		$scope.sizeOptions = [{
			id: '1',
			name: '1'
		}, {
			id: '2',
			name: '2'
		}, {
			id: '3',
			name: '3'
		}, {
			id: '4',
			name: '4'
		}];

		$scope.dismiss = function () {
			$modalInstance.dismiss();
		};

		$scope.remove = function () {
			$scope.gridster.remove_widget($widget);
			$modalInstance.close();
		};

		$scope.submit = function () {
			widget = $scope.form;
			$scope.gridster.remove_widget($widget);
			$timeout(function () {
				$scope.gridster.addWidget(widget);
			}, 300);
			$modalInstance.close(widget)
		};

	}
])

// helper code
.filter('object2Array', function () {
	return function (input) {
		var out = [];
		for (i in input) {
			out.push(input[i]);
		}
		return out;
	}
});
