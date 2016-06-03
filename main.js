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
    "plugins/layer_selector/main",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/LayerDrawingOptions",
    "esri/renderers/ClassBreaksRenderer",
    "esri/symbols/SimpleLineSymbol",
    "esri/renderer",
    "esri/Color",
    "dojo/text!./template.html",
    "dojo/text!./layers.json",
    "dojo/text!./data.json",
    "dojo/text!./extent-bookmarks.json"
    ], function (declare,
              d3,
              PluginBase,
              LayerSelectorPlugin,
              ArcGISDynamicMapServiceLayer,
              LayerDrawingOptions,
              ClassBreaksRenderer,
              SimpleLineSymbol,
              Renderer,
              Color,
              templates,
              layerSourcesJson,
              Data,
              ExtentBookmarks
              ) {
        return declare(PluginBase, {
            toolbarName: "Natural Coastal Protection",
            fullName: "Configure and control layers to be overlayed on the base map.",
			infoGraphic: "plugins/natural_coastal_protection/coastalprotection.jpg",
            resizable: true,
            width: 425,
            height: 740,
            showServiceLayersInLegend: false,
            allowIdentifyWhenActive: false,

            initialize: function(frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.loaded = false;
                this.data = $.parseJSON(Data);
                this.extents = $.parseJSON(ExtentBookmarks);
                this.pluginTmpl = _.template(this.getTemplateById('plugin'));

                this.$el = $(this.container);
                this.region = "Global";
                this.period = "ANN";
                this.layer = "people";
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

                this.mapClassBreaks = {
                    people: [
                        [-99999,      0,  [120, 120, 120, 1], "0", 1.5],
                        [    1,     500,  [26,152,80, 1], "1 - 500", 3],
                        [  501,    2500,  [145,207,96, 1], "501 - 2,500", 3],
                        [ 2501,    5000,  [217,239,139, 1], "2501 - 5,000", 3],
                        [ 5001,   10000,  [254,224,139, 1], "5001 - 10,000", 3],
                        [10001,   50000,  [252,141,89, 1], "10,001 - 50,000", 3],
                        [50001,20000000, [215,48,39, 1], "> 50,000", 3]
                    ],
                    capital: [
                        [-99999,      0,  [120, 120, 120, 1], "0", 1],
                        [    0,      75000,  [26,150,65, 1], "1 - 75", 3],
                        [  75000,      250000,  [166,217,106, 1], "76 - 250", 3],
                        [ 250000,      750000,  [253,174,97, 1], "251 - 750", 3],
                        [ 750000,     1000000,  [215,48,39, 1] , "751 - 1,000", 3],
                        [1000000,   9000000000,  [165,0,38, 1], "> 1,001", 3]
                    ],
                    area: [
                        [-99999,      0,  [120, 120, 120, 1], "0", 1],
                        [    1,      5,  [26,150,65, 1], "1 - 5", 3],
                        [  5,      20,  [166,217,106, 1], "6 - 20", 3],
                        [ 20,      50,  [253,174,97, 1], "21 - 50", 3],
                        [ 50,     100,  [215,48,39, 1], "51 - 100", 3],
                        [100,   100000,  [165,0,38, 1], "> 100", 3]
                    ],
                };

                //this.activeCountries = "COUNTRY_ID = 58 OR COUNTRY_ID = 66 OR COUNTRY_ID = 106 OR COUNTRY_ID = 113 OR COUNTRY_ID = 136 OR COUNTRY_ID = 145 OR COUNTRY_ID = 177 OR COUNTRY_ID = 223";
            },

            bindEvents: function() {
                var self = this;
                this.$el.on("change", "input[name=storm" + this.app.paneNumber + "]", $.proxy(this.changePeriod, this));
                this.$el.on("change", ".region-select", $.proxy(this.changeRegion, this));
                this.$el.on("click", ".stat", function(e) {self.changeScenarioClick(e);});
                this.$el.on("change", ".coral-select-container input", $.proxy(this.toggleCoral, this));

                this.$el.on("mouseenter", ".info-tooltip", function(e) {self.showTooltip(e);});
                this.$el.on("mouseleave", ".info-tooltip", $.proxy(this.hideTooltip, this));
                this.$el.on("mousemove", ".info-tooltip", function(e) {self.moveTooltip(e);});

            },

            getLayersJson: function() {
                return layerSourcesJson;
            },

            firstLoad: function() {
                this.loaded = true;

                var layerDefs = [];
                var layerDrawingOptions = [];
                var layerDrawingOption = new LayerDrawingOptions();
                var renderer = this.createRenderer(this.mapClassBreaks.people, "E2E1_DIF_ANN_PF");

                this.coralReefLayer = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {
                    visible: false,
                });
                this.coralReefLayer.setVisibleLayers([1]);

                this.coastalProtectionLayer = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {});
                this.coastalProtectionLayer.setVisibleLayers([0]);
                //layerDefs[0] = this.activeCountries;
                //this.coastalProtectionLayer.setLayerDefinitions(layerDefs);

                this.coastalProtectionLayer.setLayerDrawingOptions(layerDrawingOptions);
                this.map.addLayer(this.coastalProtectionLayer);
                this.map.addLayer(this.coralReefLayer);

                

            },

            activate: function() {
                var self = this;
                
                this.render();
                this.renderChart();

                if (!this.loaded) {
                    this.firstLoad();
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

            toggleCoral: function() {
                if ($(".coral-select-container input").is(":checked")) {
                    this.coralReefLayer.setVisibility(true);
                } else {
                    this.coralReefLayer.setVisibility();
                }
                this.updateLegend();
            },

            changePeriod: function() {
                this.period = this.$el.find("input[name=storm" + this.app.paneNumber + "]:checked").val();
                //http://stackoverflow.com/a/2901298
                this.$el.find(".stat.people .number .variable").html(this.numberWithCommas(Math.round(this.data[this.region]["E2E1_DIF_" + this.period + "_PF"])));
                this.$el.find(".stat.capital .number .variable").html(this.numberWithCommas(Math.round(this.data[this.region]["E2E1_DIF_" + this.period + "_BCF"] / 1000000)));
                this.$el.find(".stat.area .number .variable").html(this.numberWithCommas(Math.round(this.data[this.region]["E2E1_DIFF_" + this.period + "_AF"])));

                this.changeScenario();
            },

            numberWithCommas: function (number) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            },

            changeRegion: function() {
                this.region = this.$el.find(".region-select").val();

                if (this.region === "Global") {
                    this.$el.find(".download-summary").hide();
                } else {
                    this.$el.find(".download-summary").show();
                }
                //this.$el.find(".download-summary .country").html(this.region);
                this.changePeriod();
                var layerDefs = [];
                var regionExtent = this.extents[this.region].EXTENT;

                var extent;

                if (this.region === "Global") {
                    var initialExtent = this.app.regionConfig.initialExtent;
                    extent = new esri.geometry.Extent(initialExtent[0],initialExtent[1],initialExtent[2],initialExtent[3]);
                } else {
                    extent = new esri.geometry.Extent(regionExtent[0],regionExtent[1],regionExtent[2],regionExtent[3]);
                }

                if (this.region === "Global") {
                    layerDefs[0] = ""; //this.activeCountries;
                } else {
                    layerDefs[0] = "COUNTRY='" + this.region +"'";
                }
                this.coastalProtectionLayer.setLayerDefinitions(layerDefs);
                this.map.setExtent(extent);

                this.updateChart();

            },

            changeScenarioClick: function(e) {
                this.layer = $(e.currentTarget).closest(".stat").data("layer");
                this.$el.find(".stat.active").removeClass("active");
                $(e.currentTarget).closest(".stat").addClass("active");

                this.changeScenario();
            },

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
                    var DiffString;
                    if (this.period === "ANN") {
                        DiffString = "DIFF";
                    } else {
                        DiffString = "DIF";
                    }
                    this.variable = "AF";
                    renderer = this.createRenderer(this.mapClassBreaks.area, "E2E1_" + DiffString + "_" + this.period + "_" + this.variable);
                }

                layerDrawingOption.renderer = renderer;
                layerDrawingOptions[0] = layerDrawingOption;
                this.coastalProtectionLayer.setLayerDrawingOptions(layerDrawingOptions);

                this.coastalProtectionLayer.refresh();

                this.updateChart();
                this.updateLegend();
                
            },

            render: function() {

                var $el = $(this.pluginTmpl({
                    global: this.data.Global,
                    regions: this.data,
                    pane: this.app.paneNumber
                }));

                $(this.container).empty().append($el);

            },

            updateLegend: function () {
                var html = "";

                if (this.coralReefLayer.visible) {
                    html += "<span style='background: rgb(29,29,114)' class='legend-item coastal-reef'></span>Coral Reef Habitats<br><br>";
                }

                if (this.coastalProtectionLayer.visible) {
                    if (this.layer === "people") {
                        html += "People Protected (No.)<br>";
                    } else if (this.layer === "capital") {
                        html += "Built Capital Protected (M)<br>";
                    } else if (this.layer === "area") {
                        html += "Area Protected (sq km)<br>";
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

            showGraphTooltip: function(d, self) {
                self.$el.find(".ncp-tooltip").html(parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")).css({width: "auto"}).show();
            },

            moveGraphTooltip: function(d, el, self) {
                var offset = this.$el.offset();
                var x = d3.event.pageX - offset.left;
                var y = d3.event.pageY - offset.top;
                this.$el.find(".ncp-tooltip").css({left: x + 5, top: y});
            },

            showTooltip: function(e) {
                var text = $(e.currentTarget).data("tooltip");
                this.$el.find(".ncp-tooltip").html(text).css({width: "240"}).show();
            },

            hideTooltip: function() {
                this.$el.find(".ncp-tooltip").empty().hide();
            },

            moveTooltip: function(e) {
                var offset = this.$el.offset();
                var x = e.pageX - offset.left;
                var y = e.pageY - offset.top;
                this.$el.find(".ncp-tooltip").css({left: x + 5, top: y});
            },

            renderChart: function() {
                var self = this;

                this.chart.x = d3.scale.ordinal()
                    .domain([0, 10, 25, 50, 100])
                    .rangePoints([0, this.chart.position.width]);

                this.chart.barx = d3.scale.ordinal()
                    .domain(["present", "1m loss"])
                    .rangeRoundBands([0, this.chart.position.width], 0.15);

                this.chart.y = d3.scale.linear()
                    .range([this.chart.position.height-20,0]);

                this.chart.xAxis = d3.svg.axis()
                    .scale(this.chart.x)
                    .orient("bottom");

                this.chart.barxAxis = d3.svg.axis()
                    .scale(this.chart.barx)
                    .orient("bottom");

                this.chart.yAxis = d3.svg.axis()
                    .scale(this.chart.y)
                    .orient("left").ticks(5);

                this.chart.area = {};
                this.chart.area.current = d3.svg.area()
                    .x(function(d) { return self.chart.x(d.x); })
                    .y0(this.chart.position.height - 20)
                    .y1(function(d) { return self.chart.y(d.y); });

                this.chart.area.scenario = d3.svg.area()
                    .x(function(d) { return self.chart.x(d.x); })
                    .y0(this.chart.position.height - 20)
                    .y1(function(d) { return self.chart.y(d.y); });

                this.chart.valueline = d3.svg.line()
                    .x(function(d) { return self.chart.x(d.x); })
                    .y(function(d) { return self.chart.y(d.y); });
                
                var $chartContainer = this.$el.find(".chartContainer");

                this.chart.svg = d3.selectAll($chartContainer.toArray())
                    .append("svg")
                        .attr("width", this.chart.position.width + this.chart.position.margin.left + this.chart.position.margin.right)
                        .attr("height", this.chart.position.height + this.chart.position.margin.top + this.chart.position.margin.bottom)
                    .append("g")
                        .attr("transform", "translate(" + this.chart.position.margin.left + "," + this.chart.position.margin.right + ")");

                this.chart.svg.append("rect")
                    .attr("class", "chart-area")
                    .attr("width", this.chart.position.width)
                    .attr("height", this.chart.position.height - 20)
                    .attr("fill", "#f6f6f6");

                this.chart.svg.append("g")
                    .attr("opacity", 0)
                    .attr("class", "xaxis")
                    .attr("transform", "translate(0," + (this.chart.position.height-20) + ")")
                    .call(this.chart.xAxis);

                this.chart.svg.append("g")
                    .attr("opacity", 1)
                    .attr("class", "barxaxis")
                    .attr("transform", "translate(0," + (this.chart.position.height-20) + ")")
                    .call(this.chart.barxAxis);

                this.chart.svg.append("text")
                    .attr("class", "xaxis-label")
                    .attr("opacity", 0)
                    .attr("text-anchor", "middle")
                    .attr("transform", "translate(" + (this.chart.position.width / 2) + "," + (this.chart.position.height + 20) + ")")
                    .text("Storm Return Period");

                this.chart.svg.append("text")
                    .attr("class", "yaxis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - this.chart.position.margin.left + 20)
                    .attr("x", 0 - (this.chart.position.height / 2))
                    .attr("text-anchor", "middle")
                    .text("People at Risk (No.)");

                this.chart.svg.append("g")
                    .attr("class", "yaxis")
                    .call(this.chart.yAxis);

                // Add chart legend
                this.chart.legend = this.chart.svg.append("g")
                    .attr("class", "chart-legend")
                    .attr("opacity", 0);

                    this.chart.legend.append("rect")
                        .attr("width", "25")
                        .attr("height", "15")
                        .attr("x", "5")
                        .attr("fill", "#30928D");

                    this.chart.legend.append("text")
                        .text("present")
                        .attr("x", "32")
                        .attr("y", "11");
                    
                    this.chart.legend.append("rect")
                        .attr("width", "25")
                        .attr("height", "15")
                        .attr("x", "5")
                        .attr("y", "18")
                        .attr("fill", "#923034");

                    this.chart.legend.append("text")
                        .text("1m loss")
                        .attr("x", "32")
                        .attr("y", "29");

                // Initialize chart data 
                this.addChartPoints();


            },

            addChartPoints: function() {
                var self = this;
                this.chart.data = {};
                this.chart.data.current = {};
                this.chart.data.current.x = [0,10,25,50,100];
                this.chart.data.current.barx = ["present", "1m loss"];
                this.chart.data.current.y = [0,0,0,0,0];
                this.chart.data.current.xy = [];

                this.chart.data.scenario = {};
                this.chart.data.scenario.x = [0,10,25,50,100];
                this.chart.data.scenario.barx = ["present", "1m loss"];
                this.chart.data.scenario.y = [0,0,0,0,0];
                this.chart.data.scenario.xy = [];

                for (var i=0; i<this.chart.data.current.x.length; i++) {
                    this.chart.data.current.xy.push(
                        {
                            x: this.chart.data.current.x[i], 
                            y: this.chart.data.current.y[i]
                        }
                    );
                }

                for (var j=0; j<this.chart.data.scenario.x.length; j++) {
                    this.chart.data.scenario.xy.push(
                        {
                            x: this.chart.data.scenario.x[j],
                            y: this.chart.data.scenario.y[j]
                        }
                    );
                }

                this.chart.svg
                    .data([this.chart.data.scenario.xy])
                    .append("path")
                    .attr("opacity", 0)
                    .attr("class", "area-scenario")
                    .attr("d", this.chart.area.scenario);

                this.chart.svg
                    .data([this.chart.data.current.xy])
                    .append("path")
                    .attr("opacity", 0)
                    .attr("class", "area-current")
                    .attr("d", this.chart.area.current);

                this.chart.svg
                    .append("path")
                    .attr("class", "line current")
                    .attr("opacity", 0)
                    .attr("d", this.chart.valueline(this.chart.data.current.xy));

                this.chart.pointscurrent = this.chart.svg.append("g")
                    .attr("class", "points-current");

                this.chart.pointscurrent.selectAll('circle')
                    .data(this.chart.data.current.xy)
                    .enter().append('circle')
                    .attr("opacity", 0)
                    .attr("cx", function(d) { return self.chart.x(d.x); })
                    .attr("cy", function(d) { return self.chart.y(d.y); })
                    .attr("r", 3.5)
                    .on("mouseover", function(e) {
                        self.showGraphTooltip(e, self);
                    })
                    .on("mousemove", function(d) {
                        self.moveGraphTooltip(d, this, self);
                    })
                    .on("mouseout", function() {
                        self.hideTooltip(self);
                    });

                this.chart.svg
                    .append("path")
                    .attr("opacity", 0)
                    .attr("class", "line scenario")
                    .attr("d", this.chart.valueline(this.chart.data.scenario.xy));

                this.chart.pointsscenario = this.chart.svg.append("g")
                    .attr("class", "points-scenario");

                this.chart.pointsscenario.selectAll('circle')
                    .data(this.chart.data.scenario.xy)
                    .enter().append('circle')
                    .attr("opacity", 0)
                    .attr("cx", function(d) { return self.chart.x(d.x); })
                    .attr("cy", function(d) { return self.chart.y(d.y); })
                    .attr("r", 3.5)
                    .on("mouseover", function(e) {
                        self.showGraphTooltip(e, self);
                    })
                    .on("mousemove", function(d) {
                        self.moveGraphTooltip(d, this, self);
                    })
                    .on("mouseout", function() {
                        self.hideTooltip(self);
                    });

                // Bar chart
                var bardata = [
                    {x: "present", y: 0},
                    {x: "1m loss", y: 0}
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

            updateChart: function() {
                var self = this;

                var division = 1;
                if (this.variable === "BCF") {
                    division = 1000000;
                }

                var annual = false;
                if(this.period === "ANN") {
                    annual = true;
                }

                var text = "";
                if (this.variable === "BCF") {
                    text = "Built Capital at Risk (M)";
                } else if (this.variable === "PF") {
                    text = "People at Risk (No.)";
                } else if (this.variable === "AF") {
                    text = "Area at Risk (sq km)";
                }

                this.chart.svg.select(".yaxis-label")
                        .transition().duration(600)
                        .style("opacity", 0)
                        .transition().duration(600)
                        .style("opacity", 1)
                        .text(text);

                this.chart.data.current.xy = [];
                this.chart.data.current.y = [
                    this.data[this.region]["E1_ANN_" + this.variable] / division,
                    this.data[this.region]["E1_10RP_" + this.variable] / division,
                    this.data[this.region]["E1_25RP_"+ this.variable] / division,
                    this.data[this.region]["E1_50RP_" + this.variable] / division,
                    this.data[this.region]["E1_100RP_" + this.variable] / division
                ];

                for (var i=0; i<this.chart.data.current.x.length; i++) {
                    this.chart.data.current.xy.push(
                        {
                            x: this.chart.data.current.x[i], 
                            y: this.chart.data.current.y[i]
                        }
                    );
                }

                this.chart.data.scenario.xy = [];
                this.chart.data.scenario.y = [
                    this.data[this.region]["E2_ANN_" + this.variable] / division,
                    this.data[this.region]["E2_10RP_" + this.variable] / division,
                    this.data[this.region]["E2_25RP_"+ this.variable] / division,
                    this.data[this.region]["E2_50RP_" + this.variable] / division,
                    this.data[this.region]["E2_100RP_" + this.variable] / division
                ];

                for (var j=0; j<this.chart.data.scenario.x.length; j++) {
                    this.chart.data.scenario.xy.push(
                        {
                            x: this.chart.data.scenario.x[j], 
                            y: this.chart.data.scenario.y[j]
                        }
                    );
                }

                var bary;
                var bary1m;

                if (this.variable === "BCF") {
                    bary = this.data[this.region].E1_ANN_BCF / division;
                    bary1m = this.data[this.region].E2_ANN_BCF / division;
                } else if (this.variable === "PF") {
                    bary = this.data[this.region].E1_ANN_PF / division;
                    bary1m = this.data[this.region].E2_ANN_PF / division;
                } else if (this.variable === "AF") {
                    bary = this.data[this.region].E1_ANN_AF / division;
                    bary1m = this.data[this.region].E2_ANN_AF / division;
                }

                var bardata = [
                    {x: "present", y: bary},
                    {x: "1m loss", y: bary1m}
                ];

                if(this.period === "ANN") {
                    this.chart.y.domain([0, bary1m]);
                } else {
                    this.chart.y.domain([0, d3.max(this.chart.data.scenario.y)]);
                    if (this.period === "25RP") {
                        this.chart.svg.selectAll(".xaxis .tick").classed("current", false).each(function(d, i) {
                            if ( d === 25 ) {
                                d3.select(this)
                                    .classed("current", true);
                            }
                        });
                    }
                    if (this.period === "100RP") {
                        this.chart.svg.selectAll(".xaxis .tick").classed("current", false).each(function(d, i) {
                            if ( d === 100 ) {
                                d3.select(this)
                                    .classed("current", true);
                            }
                        });
                    }
                }

                this.chart.svg.select(".yaxis")
                    .transition().duration(1200).ease("linear")
                    .call(this.chart.yAxis);

                this.chart.svg.select(".xaxis")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1);

                this.chart.svg.select(".barxaxis")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 1 : 0);

                this.chart.svg.select(".xaxis-label")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1);

                this.chart.legend
                    .transition().delay(750).duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1);

                this.chart.svg.select(".line.current")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("d", this.chart.valueline(this.chart.data.current.xy));

                this.chart.svg.select(".area-current")
                    .data([this.chart.data.current.xy])
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("d", this.chart.area.current);

                this.chart.pointscurrent.selectAll('circle')
                    .data(this.chart.data.current.xy)
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("cx", function(d) { return self.chart.x(d.x); })
                    .attr("cy", function(d) { return self.chart.y(d.y); })
                     .attr("r", function(d) {
                        var period;
                        if (self.period === "25RP") {
                            period = 25;
                        } else if (self.period === "100RP") {
                            period = 100;
                        }
                        if (d.x === period) {
                           return 5;
                        } else {
                            return 3.5;
                        }
                    });

                this.chart.svg.select(".line.scenario")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("d", this.chart.valueline(this.chart.data.scenario.xy));

                this.chart.svg.select(".area-scenario")
                    .data([this.chart.data.scenario.xy])
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("d", this.chart.area.scenario);

                this.chart.pointsscenario.selectAll('circle')
                    .data(this.chart.data.scenario.xy)
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 0 : 1)
                    .attr("cx", function(d) { return self.chart.x(d.x); })
                    .attr("cy", function(d) { return self.chart.y(d.y); })
                    .attr("r", function(d) {
                        var period;
                        if (self.period === "25RP") {
                            period = 25;
                        } else if (self.period === "100RP") {
                            period = 100;
                        }
                        if (d.x === period) {
                           return 5;
                        } else {
                            return 3.5;
                        }
                    });

                this.chart.svg.selectAll(".bar")
                    .data(bardata)
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", annual ? 1 : 0)
                    .attr("width", this.chart.barx.rangeBand())
                    .attr("class", function(d) {return "bar " + d.x;})
                    .attr("x", function(d) { return self.chart.barx(d.x); })
                    .attr("y", function(d) { return self.chart.y(d.y); })
                    .attr("height", function(d) { return self.chart.position.height - 20 - self.chart.y(d.y); });
            },

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

            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            },

            hibernate: function () {
                // Cleanup
                if (this.coralReefLayer) {
                    this.coralReefLayer.hide();
                    this.coastalProtectionLayer.hide();
                }
                $(this.legendContainer).hide().html();
            },

            deactivate: function () {
            }

        });
    }
);
