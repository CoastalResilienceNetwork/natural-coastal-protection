require({
    // Specify library locations.
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        },
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
    "dojo/_base/declare",
    "d3",
    "framework/PluginBase",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/LayerDrawingOptions",
    "esri/renderers/ClassBreaksRenderer",
    "esri/symbols/SimpleLineSymbol",
    "esri/renderer",
    "esri/Color",
    "esri/toolbars/draw",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "dojo/text!./template.html",
    "dojo/text!./data.json",
    "dojo/text!./country-config.json"
    ], function (declare,
              d3,
              PluginBase,
              ArcGISDynamicMapServiceLayer,
              FeatureLayer,
              LayerDrawingOptions,
              ClassBreaksRenderer,
              SimpleLineSymbol,
              Renderer,
              Color,
              Draw,
              QueryTask,
              Query,
              templates,
              Data,
              CountryConfig
              ) {
        return declare(PluginBase, {
            toolbarName: "Natural Coastal Protection",
            fullName: "Configure and control layers to be overlayed on the base map.",
			infoGraphic: "plugins/natural_coastal_protection/coastalprotection.jpg",
            resizable: true,
            width: 425,
            height: 740,
            showServiceLayersInLegend: false, // Disable the default legend item which doesn't pick up our custom class breaks
            allowIdentifyWhenActive: false,

            initialize: function(frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.data = $.parseJSON(Data);
                this.countryConfig = $.parseJSON(CountryConfig);
                this.pluginTmpl = _.template(this.getTemplateById('plugin'));

                this.$el = $(this.container);

                // Default Settings
                this.region = "Global";
                this.period = "ANN";
                this.layer = "people";
                this.scenario = "";
                this.variable = "PF";

                this.bindEvents();

                this.chart = {};
                this.chart.position = {};
                this.chart.position.margin = {
                    top: 30,
                    right: 30,
                    left: 100,
                    bottom: 30
                };
                this.chart.position.width = (this.width - 10)- this.chart.position.margin.left - this.chart.position.margin.right;
                this.chart.position.height = 235  - this.chart.position.margin.top - this.chart.position.margin.bottom;
                this.selectedUnits = [];

                // Default class breaks and color ramps

                var opacity = 1;

                this.mapClassBreaks = {
                    people: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1.5],
                        [    1,     500,  [26,152,80, opacity], "1 - 500", 3],
                        [  501,    2500,  [145,207,96, opacity], "501 - 2,500", 3],
                        [ 2501,    5000,  [217,239,139, opacity], "2501 - 5,000", 3],
                        [ 5001,   10000,  [254,224,139, opacity], "5001 - 10,000", 3],
                        [10001,   50000,  [252,141,89, opacity], "10,001 - 50,000", 3],
                        [50001,20000000, [215,48,39, opacity], "> 50,000", 3]
                    ],
                    capital: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1],
                        [    0,      75000,  [26,150,65, opacity], "1 - 75", 3],
                        [  75000,      250000,  [166,217,106, opacity], "76 - 250", 3],
                        [ 250000,      750000,  [253,174,97, opacity], "251 - 750", 3],
                        [ 750000,     1000000,  [215,48,39, opacity] , "751 - 1,000", 3],
                        [1000000,   9000000000,  [165,0,38, opacity], "> 1,001", 3]
                    ],
                    area: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1],
                        [    1,      5,  [26,150,65, opacity], "1 - 5", 3],
                        [  5,      20,  [166,217,106, opacity], "6 - 20", 3],
                        [ 20,      50,  [253,174,97, opacity], "21 - 50", 3],
                        [ 50,     100,  [215,48,39, opacity], "51 - 100", 3],
                        [100,   100000,  [165,0,38, opacity], "> 100", 3]
                    ],
                };

                this.layers = {
                    'Natural_Coastal_Protection_Final': 0,
                    'Global Coral Reef Habitat': 1,
                    'Annual Present People Protected': 2,
                    'Annual Low CC 2030 People Protected': 3,
                    'Annual High CC 2030 People Protected': 4,
                    'Annual Low CC 2050 People Protected': 5,
                    'Annual High CC 2050 People Protected': 6,
                    '100 RP Present People Protected': 7,
                    '100 RP Low CC 2030 People Protected': 8,
                    '100 RP High CC 2030 People Protected': 9,
                    '100 RP Low CC 2050 People Protected': 10,
                    '100 RP High CC 2050 People Protected': 11,
                    'Annual Present Built Capital Protected': 12,
                    'Annual Low CC 2030 Built Capital Protected': 13,
                    'Annual High CC 2030 Built Capital Protected': 14,
                    'Annual Low CC 2050 Built Capital Protected': 15,
                    'Annual High CC 2050 Built Capital Protected': 16,
                    '100 RP Present Built Capital Protected': 17,
                    '100 RP Low CC 2030 Built Capital Protected': 18,
                    '100 RP High CC 2030 Built Capital Protected': 19,
                    '100 RP Low CC 2050 Built Capital Protected': 20,
                    '100 RP High CC 2050 Built Capital Protected': 21,
                    'Annual Present Hotels Protected': 22,
                    'Annual Low CC 2030 Hotels Protected': 23,
                    'Annual High CC 2030 Hotels Protected': 24,
                    'Annual Low CC 2050 Hotels Protected': 25,
                    'Annual High CC 2050 Hotels Protected': 26,
                    '100 RP Present Hotels Protected': 27,
                    '100 RP Low CC 2030 Hotels Protected': 28,
                    '100 RP High CC 2030 Hotels Protected': 29,
                    '100 RP Low CC 2050 Hotels Protected': 30,
                    '100 RP High CC 2050 Hotels Protected': 31
                }

                //this.activeCountries = "COUNTRY_ID = 58 OR COUNTRY_ID = 66 OR COUNTRY_ID = 106 OR COUNTRY_ID = 113 OR COUNTRY_ID = 136 OR COUNTRY_ID = 145 OR COUNTRY_ID = 177 OR COUNTRY_ID = 223";
            },

            layerStringBuilder: function() {
                var period = "",
                    scenario = "",
                    variable = "",
                    layerString = "";

                if (this.period === 'ANN') {
                    period = 'Annual';
                } else if (this.period ==="100RP") {
                    period = '100 RP';
                }

                if (this.scenario === "L2030") {
                    scenario = "Low CC 2030";
                } else if (this.scenario === "H2030") {
                    scenario = "High CC 2030";
                } else if (this.scenario === "L2050") {
                    scenario = "Low CC 2050";
                } else if (this.scenario === "H2050") {
                    scenario = "High CC 2050";
                } else {
                    scenario = "";
                }

                if (this.variable === "PF") {
                    variable = "People Protected";
                } else if (this.variable === "BCF") {
                    variable = "Built Capital Protected";
                } else if (this.variable === "HOTEL") {
                    variable = "Hotels Protected";
                }

                console.log(layerString = period + " " + scenario + " " + variable, this.layers[layerString = period + " " + scenario + " " + variable])

                return this.layers[layerString = period + " " + scenario + " " + variable];

            },

            bindEvents: function() {
                var self = this;

                // Set event listeners.  We bind "this" where needed so the event handler can access the full
                // scope of the plugin
                this.$el.on("change", "input[name=storm" + this.app.paneNumber + "]", $.proxy(this.changePeriod, this));
                this.$el.on("change", "input[name=climate-scenario" + this.app.paneNumber + "]", $.proxy(this.changePeriod, this));
                this.$el.on("change", ".region-select", $.proxy(this.changeRegion, this));
                this.$el.on("click", ".stat", function(e) {self.changeScenarioClick(e);});
                this.$el.on("change", ".coral-select-container input", $.proxy(this.toggleCoral, this));

                this.$el.on("mouseenter", ".info-tooltip", function(e) {self.showTooltip(e);});
                this.$el.on("mouseleave", ".info-tooltip", $.proxy(this.hideTooltip, this));
                this.$el.on("mousemove", ".info-tooltip", function(e) {self.moveTooltip(e);});

                this.$el.on("click", ".js-getSnapshot", $.proxy(this.printReport, this));

            },

            getLayersJson: function() {
                return layerSourcesJson;
            },

            // This function loads the first time the plugin is opened, or after the plugin has been closed (not minimized).
            // It sets up the layers with their default settings

            firstLoad: function() {
                var self = this;
                var layerDefs = [];
                var layerDrawingOptions = [];
                var layerDrawingOption = new LayerDrawingOptions();
                var renderer = this.createRenderer(this.mapClassBreaks.people, "E2E1_DIF_ANN_PF");

                this.coralReefLayer = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {
                    visible: false,
                    opacity: 0.5
                });
                this.coralReefLayer.setVisibleLayers([1]);

                this.coastalProtectionLayer = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {});
                this.coastalProtectionLayer.setVisibleLayers([0]);
                this.coastalProtectionFeatureLayer = new FeatureLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer/3");

                //layerDefs[0] = this.activeCountries;
                //this.coastalProtectionLayer.setLayerDefinitions(layerDefs);

                this.coastalProtectionLayer.setLayerDrawingOptions(layerDrawingOptions);
                this.map.addLayer(this.coastalProtectionLayer);
                this.map.addLayer(this.coralReefLayer);

                this.draw = new Draw(this.map);
                this.draw.on("draw-end", function(evt) {
                    self.draw.deactivate();
                    console.log(evt);

                    var query = new Query();
                    query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                    query.returnGeometry = false;
                    query.outFields = ["UNIT_ID"];
                    query.geometry = evt.geometry;
                    self.coastalProtectionFeatureLayer.queryFeatures(query, function(featureset) {
                        self.selectedUnits = _(featureset.features).map(function(feature) {
                            return feature.attributes.UNIT_ID;
                        });
                        // TODO Probably set to new custom select value
                        self.$el.find(".region-select").val("custom");
                        self.changeRegion();
                    });

                });

            },

            // This function runs everytime the plugin is open.  If the plugin was previously minimized, it restores the plugin
            // to it's previous state
            activate: function() {
                var self = this;
                
                this.render();
                this.renderChart();

                // If the plugin hasn't been opened, or if it was closed (not-minimized) run the firstLoad function and reset the
                // default variables
                if (!this.coastalProtectionLayer || !this.coastalProtectionLayer.visible) {
                    this.firstLoad();
                    this.region = "Global";
                    this.period = "ANN";
                    this.layer = "people";
                    this.variable = "PF";
                }

                // Restore storm period radios
                this.$el.find("input[value=" + this.period + "]").prop('checked', true);

                // restore state of people, capital, area selector
                this.$el.find(".stat.active").removeClass("active");
                this.$el.find("." + this.layer + ".stat").addClass("active");

                // Restore state of region select
                this.$el.find(".region-select").val(this.region);

                // Restore state of coral reef checkbox
                if (this.coralReefLayer.visible) {
                    this.$el.find(".coral-select-container input").prop("checked", true);
                }

                this.changePeriod();
                this.changeScenario();

            },

            // Turn the coral reef layer on and off
            toggleCoral: function() {
                if ($(".coral-select-container input").is(":checked")) {
                    this.coralReefLayer.setVisibility(true);
                } else {
                    this.coralReefLayer.setVisibility();
                }
                this.updateLegend();
            },

            // Change the storm return period and update the facts to match
            changePeriod: function() {
                this.period = this.$el.find("input[name=storm" + this.app.paneNumber + "]:checked").val();
                this.scenario = this.$el.find("input[name=climate-scenario" + this.app.paneNumber + "]:checked").val();
                //http://stackoverflow.com/a/2901298`
                var scenarioLabel;

                if (this.scenario !== '') {
                    scenarioLabel = "_" + this.scenario;
                } else {
                    scenarioLabel = "";
                }

                this.$el.find(".stat.people .number .variable").html(this.numberWithCommas(Math.round(this.getRegionSum("E2E1_DIF_" + this.period + "_PF" + scenarioLabel, this.region))));
                this.$el.find(".stat.capital .number .variable").html(this.numberWithCommas(Math.round(this.getRegionSum("E2E1_DIF_" + this.period + "_BCF" + scenarioLabel, this.region) / 1000000)));
                this.$el.find(".stat.area .number .variable").html(this.numberWithCommas(Math.round(this.getRegionSum("E2E1_DIF_" + this.period + "_HOTEL" + scenarioLabel, this.region))));

                this.changeScenario();
            },

            // format a number with commas
            numberWithCommas: function (number) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            },

            // Change the default region.  If global, zoom to the full extent and show data for all countries.  If regional,
            // zoom to the country based on the bookmark in the extent-bookmarks.json file and hide data for all other countries
            changeRegion: function() {
                this.region = this.$el.find(".region-select").val();
                // Show/hide the download country summary button
                if (this.region === "Global") {
                    this.$el.find(".js-getSnapshot").hide();
                } else if (this.region === "custom") {
                    this.changePeriod();
                    return;
                } else {
                    this.$el.find(".js-getSnapshot").show();
                }

                if (this.region === 'draw') {
                    this.draw.activate(Draw.POLYGON);
                    } else {
                        this.changePeriod();

                    var layerDefs = [];
                    var regionExtent = this.countryConfig[this.region].EXTENT;

                    var extent;

                    // Set the zoom extent
                    if (this.region === "Global") {
                        var initialExtent = this.app.regionConfig.initialExtent;
                        extent = new esri.geometry.Extent(initialExtent[0],initialExtent[1],initialExtent[2],initialExtent[3]);
                    } else {
                        extent = new esri.geometry.Extent(regionExtent[0],regionExtent[1],regionExtent[2],regionExtent[3]);
                    }

                    // Set the data extent
                    if (this.region === "Global") {
                        layerDefs[0] = ""; //this.activeCountries;
                    } else {
                        layerDefs[0] = "COUNTRY='" + this.region + "'";
                    }
                    console.log(this.layerStringBuilder())
                    this.coastalProtectionLayer.setVisibleLayers([this.layerStringBuilder()]);
                    this.coastalProtectionLayer.setLayerDefinitions(layerDefs);
                    this.map.setExtent(extent);

                    this.updateChart();
                }



                

            },

            // Capture the click from the fact number click events and pass to the changeScenario function
            changeScenarioClick: function(e) {
                this.layer = $(e.currentTarget).closest(".stat").data("layer");
                this.$el.find(".stat.active").removeClass("active");
                $(e.currentTarget).closest(".stat").addClass("active");

                this.changeScenario();
            },

            // Update the renderer to reflect storm return period and the fact being displayed.
            changeScenario: function() {
                var layerDrawingOptions = [];
                var layerDrawingOption = new LayerDrawingOptions();
                var renderer;
                if (this.layer === "people") {
                    this.variable = "PF";
                    renderer = this.createRenderer(this.mapClassBreaks.people, "E2E1_DIF_" + this.period + "_" + this.variable);
                } else if (this.layer === "capital") {
                    this.variable = "BCF";
                    renderer = this.createRenderer(this.mapClassBreaks.capital, "E2E1_DIF_" + this.period + "_" + this.variable);
                } else if (this.layer === "area") {
                    this.variable = "HOTEL";
                    renderer = this.createRenderer(this.mapClassBreaks.area, "E2E1_DIF_" + this.period + "_" + this.variable);
                }

                layerDrawingOption.renderer = renderer;
                layerDrawingOptions[0] = layerDrawingOption;
                this.coastalProtectionLayer.setLayerDrawingOptions(layerDrawingOptions);

                this.coastalProtectionLayer.refresh();

                this.updateChart();
                this.updateLegend();
                
            },

            // Render the plugin DOM
            render: function() {
                var $el = $(this.pluginTmpl({
                    global: this.data.Global,
                    regions: _(this.data).chain().map(function(segment) {return segment.REGION;}).uniq().value(),
                    pane: this.app.paneNumber
                }));

                $(this.container).empty().append($el);


                this.$el.find('.i18n').localize();

            },

            getRegionSum: function(attribute, region) {
                var self = this;
                // Return the summed attribute for the specified region
                if (region && region !== "Global" && region !== "custom") {
                    return _(this.data).chain().where({REGION: region}).reduce(function(num, segment) {
                        return parseFloat(segment[attribute]) + num;
                    }, 0).value();
                } else if (region && region === "custom") {
                    return _(this.data).reduce(function(num, segment) {
                        if (_.contains(self.selectedUnits, segment.UNIT_ID) ) {
                            return parseFloat(segment[attribute]) + num;
                        }
                        return 0 + num;
                    }, 0);
                } else {
                    // Otherwise, return the global sum
                    return _(this.data).reduce(function(num, segment) {
                        return parseFloat(segment[attribute]) + num;
                    }, 0);
                }

            },

            // Draw the custom legend based on our custom class breaks and the current visibility of each layer
            updateLegend: function () {
                var html = "";

                if (this.coralReefLayer.visible) {
                    html += "<span style='background: rgb(29,29,114)' class='legend-item coastal-reef'></span>Coral Reef Habitats<br><br>";
                }

                if (this.coastalProtectionLayer.visible) {
                    if (this.layer === "people") {
                        html += i18next.t("People Protected (No.)") + "<br>";
                    } else if (this.layer === "capital") {
                        html += i18next.t("Built Capital Protected ($Millions)") + "<br>";
                    } else if (this.layer === "area") {
                        html += i18next.t("Area Protected (sq km)") + "<br>";
                    }

                    _.each(this.mapClassBreaks[this.layer], function (classbreak) {
                        html += "<span style='background: rgb(";
                        html += classbreak[2][0] + ",";
                        html += classbreak[2][1] + ",";
                        html += classbreak[2][2];
                        html += ")' class='legend-item coastal-protection'></span>";
                        html += classbreak[3] + "<br>";
                    }, this);

                    
                }

                $(this.legendContainer).show().html(html);

                return html;
            },

            // Show graph tooltip on hover
            showGraphTooltip: function(d, self) {
                self.$el.find(".ncp-tooltip").html(parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")).css({width: "auto"}).show();
            },

            // Track graph tooltip to mouse movement
            moveGraphTooltip: function(d, el, self) {
                var offset = this.$el.offset();
                var x = d3.event.pageX - offset.left;
                var y = d3.event.pageY - offset.top;
                this.$el.find(".ncp-tooltip").css({left: x + 5, top: y});
            },

            // Show info tooltip on mouse hover
            showTooltip: function(e) {
                var text = $(e.currentTarget).data("tooltip");
                this.$el.find(".ncp-tooltip").html(text).css({width: "240"}).show();
            },

            // Hide graph and info tooltip on mouseout
            hideTooltip: function() {
                this.$el.find(".ncp-tooltip").empty().hide();
            },

            // Track info tooltip to mouse movement
            moveTooltip: function(e) {
                var offset = this.$el.offset();
                var x = e.pageX - offset.left;
                var y = e.pageY - offset.top;
                this.$el.find(".ncp-tooltip").css({left: x + 5, top: y});
            },

            // Render the D3 Chart
            renderChart: function() {
                var self = this;

                // The x-axis for the bar chart is also ordinal with two values
                this.chart.barx = d3.scale.ordinal()
                    .domain(["Present", "Reef Loss"])
                    .rangeRoundBands([0, this.chart.position.width], 0.15);

                this.chart.y = d3.scale.linear()
                    .range([this.chart.position.height-20,0]);

                this.chart.barxAxis = d3.svg.axis()
                    .tickFormat(function(d) {
                        return i18next.t(d);
                    })
                    .scale(this.chart.barx)
                    .orient("bottom");

                this.chart.yAxis = d3.svg.axis()
                    .scale(this.chart.y)
                    .orient("left").ticks(5);
                
                var $chartContainer = this.$el.find(".chartContainer");

                this.chart.svg = d3.selectAll($chartContainer.toArray())
                    .append("svg")
                        .attr("width", this.chart.position.width + this.chart.position.margin.left + this.chart.position.margin.right)
                        .attr("height", this.chart.position.height + this.chart.position.margin.top + this.chart.position.margin.bottom)
                    .append("g")
                        .attr("transform", "translate(" + this.chart.position.margin.left + "," + this.chart.position.margin.right + ")");

                // Add a chart background object that can be styled separately
                this.chart.svg.append("rect")
                    .attr("class", "chart-area")
                    .attr("width", this.chart.position.width)
                    .attr("height", this.chart.position.height - 20)
                    .attr("fill", "#f6f6f6");

                // Add the xaxis for the bar chart
                this.chart.svg.append("g")
                    .attr("opacity", 1)
                    .attr("class", "barxaxis")
                    .attr("transform", "translate(0," + (this.chart.position.height-20) + ")")
                    .call(this.chart.barxAxis);

                // Add the y-axis label
                this.chart.svg.append("text")
                    .attr("class", "yaxis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - this.chart.position.margin.left + 20)
                    .attr("x", 0 - (this.chart.position.height / 2))
                    .attr("text-anchor", "middle")
                    .text(i18next.t('People Protected (No.)'));

                this.chart.svg.append("g")
                    .attr("class", "yaxis")
                    .call(this.chart.yAxis);

                // Initialize chart data 
                this.addChartPoints();


            },

            // Initialize the chart points with empty values
            addChartPoints: function() {
                var self = this;

                // Bar chart
                var bardata = [
                    {x: "Present", y: 0},
                    {x: "Reef Loss", y: 0}
                ];

                this.chart.svg.selectAll(".bar")
                    .data(bardata)
                    .enter().append("rect")
                    .attr("opacity", 0)
                    .attr("class", "bar")
                    .attr("x", function(d) { return self.chart.barx(d.x); })
                    .attr("width", 30)
                    .attr("y", function(d) { return self.chart.y(d.y); })
                    .on("mouseover", function(e) {
                        self.showGraphTooltip(e, self);
                    })
                    .on("mousemove", function(d) {
                        self.moveGraphTooltip(d, this, self);
                    })
                    .on("mouseout", function() {
                        self.hideTooltip(self);
                    });

                this.updateChart();

            },

            // Set the chart data to match the current variable
            updateChart: function() {
                var self = this;

                var division = 1;
                if (this.variable === "BCF") {
                    division = 1000000;
                }

                // Update the  y-axis label to match the current variable selected
                var text = "";
                if (this.variable === "BCF") {
                    text = i18next.t('Built Capital Protected ($Millions)');
                } else if (this.variable === "PF") {
                    text = i18next.t('People Protected (No.)');
                } else if (this.variable === "HOTEL") {
                    text = i18next.t('Hotels Protected');
                }

                this.chart.svg.select(".yaxis-label")
                        .transition().duration(600)
                        .style("opacity", 0)
                        .transition().duration(600)
                        .style("opacity", 1)
                        .text(text);

                var bary;
                var bary1m;

                if (this.scenario !== '') {
                    scenarioLabel = "_" + this.scenario;
                } else {
                    scenarioLabel = "";
                }

                // Set the data for the bar chart
                if (this.variable === "BCF") {
                    bary = this.getRegionSum("E1_" + this.period + "_BCF" + scenarioLabel, this.region) / division;
                    bary1m = this.getRegionSum("E2_" + this.period + "_BCF" + scenarioLabel, this.region) / division;
                } else if (this.variable === "PF") {
                    bary = this.getRegionSum("E1_" + this.period + "_PF" + scenarioLabel, this.region) / division;
                    bary1m = this.getRegionSum("E2_" + this.period + "_PF" + scenarioLabel, this.region) / division;
                } else if (this.variable === "HOTEL") {
                    bary = this.getRegionSum("E1_" + this.period + "_HOTEL" + scenarioLabel, this.region) / division;
                    bary1m = this.getRegionSum("E2_" + this.period + "_HOTEL" + scenarioLabel, this.region) / division;
                }

                var bardata = [
                    {x: "Present", y: bary},
                    {x: "Reef Loss", y: bary1m}
                ];

                this.chart.y.domain([0, bary1m]);

                // Show and hide as appropriate all the different elements.  We animate these over the course of 1200ms
                this.chart.svg.select(".yaxis")
                    .transition().duration(1200).ease("linear")
                    .call(this.chart.yAxis);

                this.chart.svg.select(".barxaxis")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", 1);

                this.chart.svg.selectAll(".bar")
                    .data(bardata)
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", 1)
                    .attr("width", this.chart.barx.rangeBand())
                    .attr("class", function(d) {return "bar " + d.x;})
                    .attr("x", function(d) { return self.chart.barx(d.x); })
                    .attr("y", function(d) { return self.chart.y(d.y); })
                    .attr("height", function(d) { return self.chart.position.height - 20 - self.chart.y(d.y); });
            },

            // Create a renderer for the coastal protection layer using the custom defined classbreaks and colors for each
            // scenario and fact combination
            createRenderer: function(classBreaks, field) {
                var defaultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,0,0,0]), 0);
                var renderer = new ClassBreaksRenderer(defaultSymbol, field);
                _(classBreaks).each(function(classBreak) {
                    renderer.addBreak({
                        minValue: classBreak[0], 
                        maxValue: classBreak[1], 
                        symbol: SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(classBreak[2]), classBreak[4]),
                        label: classBreak[3]
                    });
                });
                return renderer;
            },

            // Download the pdf report for the current region
            printReport: function() {
                window.open(this.countryConfig[this.region].SNAPSHOT, '_blank'); 
                return false;
            },

            // Get the requested template from the template file based on id.
            // We currently only have one template for this plugin
            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            },

            // Turn of the layers when hibernating
            hibernate: function () {
                // Cleanup
                if (this.coralReefLayer) {
                    this.coralReefLayer.hide();
                    this.coastalProtectionLayer.hide();
                }
                $(this.legendContainer).hide().html();
            }

        });
    }
);
