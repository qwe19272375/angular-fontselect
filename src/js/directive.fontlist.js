/* global NAME_CONTROLLER, DIR_PARTIALS, DIRECTION_NEXT, DIRECTION_PREVIOUS, KEY_DOWN */
/* global KEY_UP, KEY_RIGHT, KEY_LEFT, PAGE_SIZE_DEFAULT */
var NAME_JDFONTLIST = 'jdFontlist';
var NAME_JDFONTLIST_CONTROLLER = NAME_JDFONTLIST + NAME_CONTROLLER;

fontselectModule.directive(NAME_JDFONTLIST, function() {
  return {
    scope: {
      id: '=fsid',
      fonts: '=',
      current: '=',
      text: '=',
      active: '='
    },
    restrict: 'E',
    templateUrl: DIR_PARTIALS + 'fontlist.html',
    replace: true,
    controller: NAME_JDFONTLIST_CONTROLLER
  };
});

fontselectModule.controller(NAME_JDFONTLIST_CONTROLLER, [
  '$scope',
  '$rootScope',
  '$filter',
  'jdFontselect.fonts',
  /* jshint maxparams: 4 */
  function($scope, $rootScope, $filter, fontsService) {
  /* jshint maxparams: 3 */
    var _filteredFonts;
    var _sortedFonts;
    var _categorizedFonts;
    var _fontsInSubsets;
    var _fontsInProviders;
    var _lastPageCount = 0;
    var _sortCache = {};

    $scope.page = {
      size: PAGE_SIZE_DEFAULT,
      count: 0,
      current: 0
    };

    function isOnCurrentPage(index) {
      var currentMinIndex = $scope.page.current * $scope.page.size;

      return index >= currentMinIndex && index < currentMinIndex + $scope.page.size;
    }

    $scope.keyfocus = function(direction, amount) {
      var index = _filteredFonts.indexOf($scope.current.font);
      var pageoffset = $scope.page.size * $scope.page.current;
      var onPage = isOnCurrentPage(index);

      if (angular.isUndefined(amount)) {
        amount = 1;
      }

      index += (direction === DIRECTION_PREVIOUS ? -amount : amount);

      if (!onPage && _filteredFonts[index + pageoffset]) {
        index += pageoffset;
      }

      if (_filteredFonts[index]) {
        $scope.current.font = _filteredFonts[index];

        $scope.page.current = Math.floor(index / $scope.page.size);

        $rootScope.$digest();
      }
    };

    document.addEventListener('keydown', function(event) {
      if (!$scope.active) {
        return;
      }

      function prevent() {
        event.preventDefault();
        return false;
      }

      var key = event.keyCode;

      if (key === KEY_DOWN) {
        $scope.keyfocus(DIRECTION_NEXT);
        return prevent();
      } else if (key === KEY_UP) {
        $scope.keyfocus(DIRECTION_PREVIOUS);
        return prevent();
      }

      if (document.activeElement.tagName === 'INPUT' && document.activeElement.value) {
        return;
      }

      var amount = $scope.page.size;
      if (key === KEY_RIGHT) {
        if (!$scope.current.font) {
          amount++;
        }
        $scope.keyfocus(DIRECTION_NEXT, amount);
        return prevent();
      } else if (key === KEY_LEFT) {
        $scope.keyfocus(DIRECTION_PREVIOUS, $scope.page.size);
        return prevent();
      }
    });

    /**
     * Set the current page
     *
     * @param {Number} currentPage
     * @return {void}
     */
    $scope.setCurrentPage = function(currentPage) {
      $scope.page.current = currentPage;
    };

    /**
     * Go to the next or previous page.
     *
     * @param  {String} direction 'next' or 'prev'
     * @return {void}
     */
    $scope.paginate = function(direction) {
      if (!$scope.paginationButtonActive(direction)) {
        return;
      }

      $scope.page.current += (direction === DIRECTION_PREVIOUS ? -1 : 1);
    };

    /**
     * Check if the pagination button is active
     *
     * @param  {String} direction 'next' or 'prev'
     * @return {Boolean}
     */
    $scope.paginationButtonActive = function(direction) {
      _updatePageCount();
      _updateCurrentPage();
      var page = $scope.page;

      return (
        (direction === DIRECTION_NEXT && page.current < page.count - 1) ||
        (direction === DIRECTION_PREVIOUS && page.current > 0)
      );
    };

    /**
     * Get an array with the length similar to the
     * amount of pages we have. (So we can use it in a repeater)
     *
     * Also update the current page and the current amount of pages.
     *
     * @return {Array}
     */
    $scope.getPages = function() {
      _updatePageCount();
      var pages = new Array($scope.page.count);

      _updateCurrentPage();

      /* Display the page buttons only if we have at least two pages. */
      if (pages.length <= 1) {
        return [];
      }
      return pages;
    };

    /**
     * Apply the current filters to our internal font object.
     *
     * Ensure we only apply filters when the filter parameters
     * or the source have changed.
     *
     * @return {Array}
     */
    $scope.getFilteredFonts = function() {
      if (!angular.isArray($scope.fonts)) {
        _filteredFonts = [];
      } else {
        var direction = $scope.current.sort.attr.dir;

        /* Apply all filters if the source is new. */
        if ($scope.fonts.length !== _sortCache.sourceCache) {
          _sortCache.sourceCache = $scope.fonts.length;
          /* ESKALATE! */
          _sortCache.providers = null;
        }

        if (_sortCache.providers !== JSON.stringify($scope.current.providers)) {
          _sortCache.providers = JSON.stringify($scope.current.providers);
          _sortCache.subsets = null;

          _fontsInProviders = $scope.fonts.filter(function(font) {
            return $scope.current.providers[font.provider];
          });
        }

        if (_sortCache.subsets !== JSON.stringify($scope.current.subsets)) {
          _sortCache.subsets = JSON.stringify($scope.current.subsets);
          _sortCache.sortdir = null;

          _fontsInSubsets = $filter('hasAllSubsets')(
            _fontsInProviders,
            $scope.current.subsets
          );
        }

        if (_sortCache.sortattr !== $scope.current.sort.attr.key ||
          _sortCache.sortdir !== $scope.current.sort.direction)
        {
          _sortCache.sortattr = $scope.current.sort.attr.key;
          _sortCache.sortdir = $scope.current.sort.direction;
          _sortCache.category = null;

          _sortedFonts = $filter('orderBy')(
            _fontsInSubsets,
            $scope.current.sort.attr.key,
            $scope.current.sort.direction ? direction : !direction
          );
        }

        if (_sortCache.category !== $scope.current.category) {
          _sortCache.category = $scope.current.category;
          _sortCache.search = null;

          _categorizedFonts = $filter('filter')(_sortedFonts, {category: $scope.current.category}, true);
        }

        /* check if the source is the same */
        if (_sortCache.search !== $scope.current.search) {
          _sortCache.search = $scope.current.search;

          _filteredFonts = $filter('fuzzySearch')(_categorizedFonts, {name: $scope.current.search});
        }

      }

      return _filteredFonts;
    };

    /**
     * Calculate the amount of pages we have.
     *
     * @return {void}
     */
    function _updatePageCount() {
      _lastPageCount = $scope.page.count;

      if (!angular.isArray($scope.fonts)) {
        return 0;
      }

      if (_filteredFonts.length) {
        $scope.page.count = Math.ceil(_filteredFonts.length / $scope.page.size);
      }
    }

    /**
     * Whenever the amount of pages is changing:
     * Make sure we're not staying on a page that does not exist.
     * And if we have a font selected, try to stay on the page of
     * that font.
     *
     * @return {void}
     */
    function _updateCurrentPage() {
      /* do nothing if the amount of pages hasn't change */
      if (_lastPageCount === $scope.page.count) {
        return;
      }

      var currentFont = $scope.current.font;

      /* check if the current font is anywhere on our current pages */
      var index = _filteredFonts.indexOf(currentFont);

      /* If we have a font selected and it's inside the filter we use */
      if (currentFont && index >= 0) {
        /* go to this page */
        $scope.page.current = Math.ceil((index + 1) / $scope.page.size) - 1;
      } else {
        /* Just go to the last page if the current does not exist */
        if ($scope.page.current > $scope.page.count) {
          $scope.page.current = $scope.page.count-1;
        }
      }
    }

    /* Initiate! */
    fontsService._initGoogleFonts();
  }
]);