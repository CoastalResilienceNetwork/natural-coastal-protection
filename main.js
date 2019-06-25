
require({
    // Specify library locations.
    packages: [
        {
        	name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: 'd3',
            location: '//d3js.org',
            main: 'd3.v3.min' 
        }
    ]
});

define([
    'dojo/_base/declare',
    'd3',
    'framework/PluginBase',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/renderer',
    'esri/Color',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/geometry/Extent',
    'dijit/layout/ContentPane',
    './State',
    'dojo/dom',
    'dojo/text!./template.html',
    'dojo/text!./mangrove_print_template.html',
    'dojo/text!./country-config.json',
    'dojo/text!./region.json'
    ], function(declare,
        d3,
        PluginBase,
        ArcGISDynamicMapServiceLayer,
        FeatureLayer,
        SimpleLineSymbol,
        SimpleFillSymbol,
        SimpleRenderer,
        Renderer,
        Color,
        Query,
        QueryTask,
        Extent,
        ContentPane,
        State,
        dom,
        templates,
        mangrovePrintTemplate,
        CountryConfig,
        RegionJSON
) {
        return declare(PluginBase, {
            toolbarName: 'Natural Coastal Protection',
            fullName: 'Natural Coastal Protection',
            resizable: false,
            width: 425,
            // Disable the default legend item which doesn't pick up our custom class breaks
            showServiceLayersInLegend: true,
            allowIdentifyWhenActive: false,
            size: 'custom',
            hasCustomPrint: true,
            usePrintModal: false,

            initialize: function(frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.regionJSON = $.parseJSON(RegionJSON);
                this.data = this.regionJSON.coralData;
                this.dataMangrove = this.regionJSON.mangroveData;
                this.referenceLayers = this.regionJSON.referenceLayers;
                this.countryConfig = this.regionJSON.regions;
                this.adminFields = this.regionJSON.adminFields;
                this.pluginTmpl = _.template(this.getTemplateById('plugin'));
                this.printMangroveTmpl = _.template(mangrovePrintTemplate);
                this.transitionsEnabled = false;
                this.serviceURL = this.regionJSON.serviceURL;
                this.adminUnitsIndex = this.regionJSON.adminUnitsIndex;
                this.adminTableIndex = this.regionJSON.adminTableIndex;

                this.$el = $(this.container);

                this.state = new State();
                this.state = this.state.setRegion(this.regionJSON.defaultRegion);
                if(this.regionJSON.hasAdmin && ! this.regionJSON.hasNCP) {
                    this.state = this.state.setAdminVisibility(true);
                }
                this.provider = this.state.getProvider();
                this.region = this.state.getRegion();
                this.period = this.state.getPeriod();
                this.layer = this.state.getLayer();
                this.adminUnit = this.state.getAdminUnit();
                this.adminVariable = this.state.getAdminVariable();
                this.variable = this.state.getVariable();
                this.coralVisibility = this.state.getCoralVisibility();
                this.mangroveVisibility = this.state.getMangroveVisibility();
                this.adminVisibility = this.state.getAdminVisibility();
                this.layerID = 40; // TODO GET/SAVE STATE

                this.layerLookup = {
                    mangroves: {
                        ANN: {
                            people: 33,
                            capital: 34,
                        },
                        '25RP': {
                            people: 35,
                            capital: 36,
                        },
                        '50RP': {
                            people: 37,
                            capital: 38,
                        }
                    },
                    coral: {
                        ANN: {
                            people: 40,
                            capital: 41,
                            area: 42,
                        },
                        '25RP': {
                            people: 43,
                            capital: 44,
                            area: 45,
                        },
                        '100RP': {
                            people: 46,
                            capital: 47,
                            area: 48,
                        }
                    }
                };

                this.bindEvents();

                this.chart = {};
                this.chart.position = {};
                this.chart.position.margin = {
                    top: 30,
                    right: 30,
                    left: 105,
                    bottom: 80
                };
                this.chart.position.height = 285 - this.chart.position.margin.top -
                    this.chart.position.margin.bottom;
                $(this.printButton).hide();

                
            },

            bindEvents: function() {
                var self = this;

                // Set event listeners.  We bind 'this' where needed so the event handler
                // can access the full scope of the plugin
                this.$el.on('click', 'input#BCS-option', $.proxy(this.updateRadios, this));
                this.$el.on('change', 'input[name=storm' +
                    this.app.paneNumber + ']', $.proxy(this.updateRadios, this));

                this.$el.on('change', 'input[name=storm' +
                    this.app.paneNumber + ']', $.proxy(this.updateLayers, this));

                this.$el.on('change', '#ncp-select-region', $.proxy(this.changeRegion, this));
                this.$el.on('change', '#chosen-ref-layers', $.proxy(this.changeReferenceLayers, this));
                this.$el.on('click', '.tab-item:not(.active) .tab-link', $.proxy(this.changeFocus, this));
                this.$el.on('change', '#ncp-provider', $.proxy(this.changeProvider, this));
                
                this.$el.on('click', '#ncp-pane .stat', function(e) {self.changeScenarioClick(e);});
                this.$el.on('click', '#admin-pane .stat', function(e) {self.changeAdminScenarioClick(e);});
                this.$el.on('click', '#cancel-admin-select', function(e) {self.clearAdminSelection()});
                this.$el.on('slidechange', '#admin-pane #slider', function(e, ui) {self.changeAdminOpacity(e, ui)});
                this.$el.on('change', '.coral-select-container input',
                        $.proxy(this.toggleCoral, this));
                this.$el.on('change', '.mangrove-select-container input',
                        $.proxy(this.toggleMangrove, this));

                this.$el.on('click', '.js-getSnapshot', $.proxy(this.printReport, this));
            },

            setState: function(data) {
                this.state = new State(data);
                this.region = data.region;
                this.period = data.period;
                this.layer = data.layer;
                this.variable = data.variable;
                this.adminUnit = data.adminUnit;
                this.adminVariable = data.adminVariable;
                this.coralVisibility = data.coralVisibility;
                this.mangroveVisibility = data.mangroveVisibility;
                this.adminVisibility = data.adminVisibility;
                this.adminReferenceLayers = data.adminReferenceLayers;
            },

            getState: function() {
                return {
                    region: this.state.getRegion(),
                    period: this.state.getPeriod(),
                    layer: this.state.getLayer(),
                    variable: this.state.getVariable(),
                    adminUnit: this.state.getAdminUnit(),
                    adminVariable: this.state.getAdminVariable(),
                    coralVisibility: this.state.getCoralVisibility(),
                    mangroveVisibility: this.state.getMangroveVisibility(),
                    adminVisibility: this.state.getAdminVisibility(),
                    adminReferenceLayers: this.state.getAdminReferenceLayers()
                };
            },

            // This function loads the first time the plugin is opened, or after the plugin has
            // been closed (not minimized). It sets up the layers with their default settings

            firstLoad: function() {
                var self = this;

                if(this.regionJSON.hasNCP) {
                    this.coralReefLayer = new ArcGISDynamicMapServiceLayer('https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer', {
                        visible: this.state.getCoralVisibility(),
                        opacity: 0.5
                    });
                    this.coralReefLayer.setVisibleLayers([1]);
    
                    this.mangroveLayer = new ArcGISDynamicMapServiceLayer('https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer', {
                        visible: this.state.getMangroveVisibility(),
                        opacity: 0.5
                    });
                    this.mangroveLayer.setVisibleLayers([39]);
    
                    this.coastalProtectionLayer = new ArcGISDynamicMapServiceLayer('https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer', {});
                    this.coastalProtectionLayer.setVisibleLayers([17]);
    
                    this.map.addLayer(this.coastalProtectionLayer);
                    this.map.addLayer(this.coralReefLayer);
                    this.map.addLayer(this.mangroveLayer);
                }

                if(this.regionJSON.hasAdmin) {
                    this.adminUnitsLayer = new FeatureLayer(this.serviceURL + '/' + this.adminUnitsIndex, {
                        visible: this.state.getAdminVisibility(),
                        surfaceType: "svg",
                        dataAttributes: [
                            "OBJECTID",
                            "ADMIN_ID"
                        ]
                    });
    
                    // Set selection style of the layer
                    this.adminUnitsLayer.setSelectionSymbol(new SimpleFillSymbol(
                        SimpleFillSymbol.STYLE_SOLID,
                            new SimpleLineSymbol(
                                SimpleLineSymbol.STYLE_SOLID, 
                                new Color([0, 150, 214, 1]), 
                                3
                            ),
                            new Color([0, 0, 0, 0.1])
                        )
                    );
                        
                    this.adminUnitsLayer.on("click", function(e) {
                        self.changeAdminClick(e.graphic.attributes.ADMIN_ID, new Extent(e.graphic._extent).expand(1.5));
                    });
    
                    this.adminVisualizationLayer = new ArcGISDynamicMapServiceLayer(this.serviceURL, {
                        visible: this.state.getAdminVisibility(),
                        opacity: 1
                    });
    
                    this.adminReferenceLayers = new ArcGISDynamicMapServiceLayer(this.serviceURL, {
                        visible: this.state.getAdminVisibility(),
                        opacity: 1
                    });
    
                    this.adminLookupTable = new QueryTask(this.serviceURL + "/" + this.adminTableIndex);
    
                    this.map.addLayer(this.adminUnitsLayer);
                    this.map.addLayer(this.adminVisualizationLayer);
                    this.map.addLayer(this.adminReferenceLayers);
                }
            },

            // This function runs everytime the plugin is open.  If the plugin was previously
            // minimized, it restores the plugin to it's previous state
            activate: function() {
                var self = this;

                this.$el.prev('.sidebar-nav').find('.nav-title').css('margin-left', '25px');

                // If the plugin hasn't been opened, or if it was closed (not-minimized)
                // run the firstLoad function and reset the default variables
                if (!this.coastalProtectionLayer || !this.coastalProtectionLayer.visible || !this.adminUnitsLayer || !this.adminUnitsLayer.visible) {
                    this.firstLoad();
                }

                var RP = ['25RP', '50RP', '100RP'];

                this.render();

                if(this.regionJSON.hasNCP) {
                    this.renderChart();
                    this.coastalProtectionLayer.show();
    
                    // Restore storm period radios
                    this.$el.find('input[value=' + this.period + ']').prop('checked', true);
                    if(RP.includes(this.period)) {
                        this.$el.find('input#BCS-option').prop('checked', true);
                    }
    
                    // restore state of people, capital, area selector
                    this.$el.find('.stat.active').removeClass('active');
                    this.$el.find('.' + this.layer + '.stat').addClass('active');

                    // Restore state of coral reef checkbox
                    if (this.coralReefLayer.visible) {
                        this.$el.find('.coral-select-container input').prop('checked', true);
                    }

                    this.$el.find('.info-tooltip').tooltip({
                        tooltipClass: 'ncp-tooltip',
                        track: true
                    });

                    if (this.provider === 'mangroves') {
                        this.$el.find('#ncp-provider').prop('checked', true);
                    }

                    // Restore state of region select
                    this.$el.find('#ncp-select-region').val(this.region).trigger('chosen:updated');
                    this.changeRegion();
                    this.updateLayers();
                }
                
               

                if(this.regionJSON.hasAdmin) {
                    this.changeRegion();
                    this.$el.find('.' + this.adminVariable + '.stat').addClass('active');
                    if(this.state.getAdminVisibility()) {
                        this.changeFocus();
                        this.$el.find('#admin-pane').addClass('active');
                        this.$el.find('#ncp-pane').removeClass('active');
                        this.$el.find('#admin-tab').addClass('active');
                        this.$el.find('#ncp-tab').removeClass('active');
                        this.adminUnitsLayer.refresh();
                        this.adminVisualizationLayer.refresh();
                        this.adminReferenceLayers.refresh();
                    }
                }
            },

            deactivate: function() {
                if (this.appDiv !== undefined) {
                    if(this.regionJSON.hasNCP) {
                        this.coralReefLayer.hide();
                        this.coastalProtectionLayer.hide();
                        this.mangroveLayer.hide();
                    }
                    if(this.regionJSON.hasAdmin) {
                        this.adminUnitsLayer.hide();
                        this.adminVisualizationLayer.hide();
                        this.adminReferenceLayers.hide();
                    }
                    $(this.legendContainer).hide().html();
                }
            },

            // Turn off the layers when hibernating
            hibernate: function() {
                // Cleanup
                if (this.appDiv !== undefined) {
                    if(this.regionJSON.hasNCP) {
                        this.coralReefLayer.hide();
                        this.coastalProtectionLayer.hide();
                        this.mangroveLayer.hide();
                    }
                    if(this.regionJSON.hasAdmin) {
                        this.adminUnitsLayer.hide();
                        this.adminVisualizationLayer.hide();
                        this.adminReferenceLayers.hide();
                    }
                    $(this.legendContainer).hide().html();
                }
            },

            changeScenarioClick: function(e) {
                this.layer = $(e.currentTarget).closest('.stat').data('layer');
                this.$el.find('.stat.active').removeClass('active');
                $(e.currentTarget).closest('.stat').addClass('active');

                this.updateLayers();
            },

            changeFocus: function() {
                if(this.regionJSON.hasNCP) {
                    if(this.$el.find('#ncp-tab').hasClass('active')) {
                        this.adminUnitsLayer.setVisibility(true);
                        this.adminVisualizationLayer.setVisibility(true);
                        this.adminReferenceLayers.setVisibility(true);
                        this.coastalProtectionLayer.setVisibility(false);
                        this.coralReefLayer.setVisibility(false);
                        this.mangroveLayer.setVisibility(false);
                        this.state = this.state.setAdminVisibility(true);
                        if(this.state.getAdminUnit()) {
                            this.changeAdminClick(this.state.getAdminUnit(), null);
                        } else {
                            this.calcAdminByCountry();
                        }
                        if(this.state.getAdminReferenceLayers()) {
                            this.$el.find('#chosen-ref-layers').val(this.state.getAdminReferenceLayers()).trigger('chosen:updated').trigger('change');
                        }
                        this.$el.find('.' + this.state.getAdminVariable() + '.stat').click();
                    } else {
                        this.adminUnitsLayer.setVisibility(false);
                        this.adminVisualizationLayer.setVisibility(false);
                        this.adminReferenceLayers.setVisibility(false);
                        this.coastalProtectionLayer.setVisibility(true);
                        this.coralReefLayer.setVisibility(this.state.getCoralVisibility());
                        this.mangroveLayer.setVisibility(this.state.getMangroveVisibility());
                        this.state = this.state.setAdminVisibility(false);
                        this.changeRegion();
                        this.changePeriod();
                        this.updateLayers();
                    }
                } else {
                    this.adminUnitsLayer.setVisibility(true);
                    this.adminVisualizationLayer.setVisibility(true);
                    this.adminReferenceLayers.setVisibility(true);
                    this.state = this.state.setAdminVisibility(true);
                    if(this.state.getAdminUnit()) {
                        this.changeAdminClick(this.state.getAdminUnit(), null);
                    } else {
                        this.calcAdminByCountry();
                    }
                    if(this.state.getAdminReferenceLayers()) {
                        console.log(this.state.getAdminReferenceLayers());
                        this.$el.find('#chosen-ref-layers').val(this.state.getAdminReferenceLayers()).trigger('chosen:updated').trigger('change');
                    }
                    this.$el.find('.' + this.state.getAdminVariable() + '.stat').click();
                }
            },

            changeProvider: function() {
                if (this.$el.find('#ncp-provider').prop('checked')) {
                    this.state = this.state.setProvider('mangroves');
                    this.provider = 'mangroves';
                } else {
                    this.state = this.state.setProvider('coral');
                    this.provider = 'coral';
                }
                this.layer = 'people';
                this.period = 'ANN';
                this.$el.find('input[value=' + this.period + ']').prop('checked', true);
                this.$el.find('input#BCS-option').prop('checked', false);
                this.$el.find('#ncp-select-region').prop('disabled', false);

                if (this.provider === 'coral') {
                    this.$el.find('#rp50').hide();
                    this.$el.find('#rp100').show();
                    this.$el.find('.coral-select-container').show();
                    this.$el.find('.mangrove-select-container').hide();
                    this.$el.find('.stat.area').show();
                    this.$el.find('option.coral').show();
                    this.$el.find('option.mangrove').hide();
                    this.$el.find('.mangrove-select-container input').prop('checked', false).trigger('change');
                    this.$el.find('.coral-only').show();
                    this.$el.find('.mangrove-only').hide();
                    this.$el.find('#ncp-select-region').trigger('chosen:updated');
                } else if (this.provider === 'mangroves') {
                    this.$el.find('#rp50').show();
                    this.$el.find('#rp100').hide();
                    this.$el.find('.coral-select-container').hide();
                    this.$el.find('.mangrove-select-container').show();
                    this.$el.find('.stat.area').hide();
                    this.$el.find('option.coral').hide();
                    this.$el.find('option.mangrove').show();
                    this.$el.find('.coral-select-container input').prop('checked', false).trigger('change');
                    this.$el.find('#ncp-select-region').val("Philippines").trigger('chosen:updated');
                    this.$el.find('.coral-only').hide();
                    this.$el.find('.mangrove-only').show();
                    this.$el.find('.stat.active').removeClass('active');
                    this.$el.find('.stat.people').addClass('active');
                    if (Object.keys(this.dataMangrove).length <= 2) { // 2 because we always have a global object
                        this.$el.find('#ncp-select-region').prop('disabled', true);
                    }
                }
                this.$el.find('#ncp-select-region').trigger("chosen:updated");
                this.changeRegion();
                this.changePeriod();
                this.updateLayers();
            },

            // Turn the coral reef layer on and off
            toggleCoral: function() {
                if (this.$el.find('.coral-select-container input').is(':checked')) {
                    this.coralReefLayer.setVisibility(true);
                    this.state = this.state.setCoralVisibility(true);
                } else {
                    this.coralReefLayer.setVisibility();
                    this.state = this.state.setCoralVisibility(false);
                }
            },

            toggleMangrove: function() {
                if (this.$el.find('.mangrove-select-container input').is(':checked')) {
                    this.mangroveLayer.setVisibility(true);
                    this.state = this.state.setMangroveVisibility(true);
                } else {
                    this.mangroveLayer.setVisibility();
                    this.state = this.state.setMangroveVisibility(false);
                }
            },

            changeAdminClick: function(admin_id, extent) {
                var self = this;
                if(extent) {
                    this.map.setExtent(extent, true);
                }
                
                // select the chosen admin unti
                var selectionQuery = new Query();
                selectionQuery.where = "ADMIN_ID = " + admin_id;
                selectionQuery.outFields = this.adminFields;
                this.adminUnitsLayer.selectFeatures(selectionQuery);

                // update state to reflect the new unti
                this.adminUnit = admin_id;
                this.state = this.state.setAdminUnit(this.adminUnit);

                // get all fields from lookup table, update UI
                this.adminLookupTable.execute(selectionQuery, function(featureSet) {
                    self.updateDemographics(featureSet.features[0].attributes);
                    self.$el.find('.admin-name').html(featureSet.features[0].attributes.ADMIN_NAME);
                    self.$el.find('#cancel-admin-select').show();
                });
            },

            changeReferenceLayers: function() {
                var layers = $('#chosen-ref-layers').val();
                if(layers) {
                    this.adminReferenceLayers.setVisibleLayers(layers);
                    this.state = this.state.setAdminReferenceLayers(layers);
                } else {
                    this.adminReferenceLayers.setVisibleLayers([]);
                    this.state = this.state.setAdminReferenceLayers([]);
                }
            },

            changeAdminOpacity: function(e, ui) {
                console.log(e);
                this.adminVisualizationLayer.setOpacity(ui.value / 100);
            },

            clearAdminSelection: function() {
                this.$el.find('.admin-name').html(this.region);
                this.adminUnitsLayer.clearSelection();
                this.state = this.state.setAdminUnit(false)
                this.calcAdminByCountry();
            },

            calcAdminByCountry: function() {
                var self = this;

                this.$el.find('#cancel-admin-select').hide();

                var selectionQuery = new Query();
                selectionQuery.where = "1=1";
                selectionQuery.outFields = this.adminFields;
                
                // get all fields/records from lookup table, update UI
                this.adminLookupTable.execute(selectionQuery, function(featureSet) {
                    var values = {};
                    count = 0;

                    // SUM all values for all records
                    featureSet.features.forEach(feature => {
                        var attrs = feature.attributes;
                        self.adminFields.forEach(field => {
                            if(values.hasOwnProperty(field) && attrs[field] != null) {
                                values[field] = values[field] + attrs[field];
                            } else {
                                values[field] = attrs[field];
                            }
                        });
                        count = count + 1;
                    });

                    // for averages, divide by total number of records
                    if(values["POP_FLDRISK"]) {
                        values["POP_FLDRISK"] = values["POP_FLDRISK"] / count;
                    }
                    if(values["POP_PVTY1"]) {
                        values["POP_PVTY1"] = values["POP_PVTY1"] / count;
                    }
                    if(values["POP_PVTY2"]) {
                        values["POP_PVTY2"] = values["POP_PVTY2"] / count;
                    }
                    if(values["POP_ILLT"]) {
                        values["POP_ILLT"] = values["POP_ILLT"] / count;
                    }
                    if(values["POP_AGE"]) {
                        values["POP_AGE"] = values["POP_AGE"] / count;
                    }
                    if(values["HOUSE_DENS"]) {
                        values["HOUSE_DENS"] = values["HOUSE_DENS"] / count;
                    }
                    if(values["CLIMATE_VUL"]) {
                        values["CLIMATE_VUL"] = values["CLIMATE_VUL"] / count;
                    }
                    if(values["MANG_CHNG"]) {
                        values["MANG_CHNG"] = values["MANG_CHNG"] / count;
                    }

                    // Update UI
                    self.updateDemographics(values);
                });
            },

            /* 
                Update displayed census statistics and their values. 
                Show/hide fields based on null value returned from service as some geographies will not include all statistics 
            */
            updateDemographics: function(stats) {
                if(stats.POP_FLDRISK_NO != null) {
                    this.$el.find('.stat.population-flood').show();
                    this.$el.find('.stat.population-flood .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_FLDRISK_NO))
                    );
                } else {
                    this.$el.find('.stat.population-flood').hide();
                }

                if(stats.POP_FLDRISK != null) {
                    this.$el.find('.stat.percent-population-flood').show();
                    this.$el.find('.stat.percent-population-flood .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_FLDRISK * 100))
                    );
                } else {
                    this.$el.find('.stat.percent-population-flood').hide();
                }

                if(stats.POP_PVTY1 != null) {
                    this.$el.find('.stat.percent-population-icv1').show();
                    this.$el.find('.stat.percent-population-icv1 .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_PVTY1 * 100))
                    );
                } else {
                    this.$el.find('.stat.percent-population-icv1').hide();
                }

                if(stats.POP_PVTY2 != null) {
                    this.$el.find('.stat.percent-population-icv2').show();
                    this.$el.find('.stat.percent-population-icv2 .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_PVTY2 * 100))
                    );
                } else {
                    this.$el.find('.stat.percent-population-icv2').hide();
                }

                if(stats.POP_ILLT != null) {
                    this.$el.find('.stat.percent-population-illiterate').show();
                    this.$el.find('.stat.percent-population-illiterate .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_ILLT * 100))
                    );
                } else {
                    this.$el.find('.stat.percent-population-illiterate').hide();
                }

                if(stats.POP_AGE != null) {
                    this.$el.find('.stat.percent-vulnerable-population').show();
                    this.$el.find('.stat.percent-vulnerable-population .number .variable').html(
                        this.numberWithCommas(Math.round(stats.POP_AGE * 100))
                    );
                } else {
                    this.$el.find('.stat.percent-vulnerable-population').hide();
                }

                if(stats.INFRA_RDS != null) {
                    this.$el.find('.stat.infra-roads').show();
                    this.$el.find('.stat.infra-roads .number .variable').html(
                        this.numberWithCommas(Math.round(stats.INFRA_RDS))
                    );
                } else {
                    this.$el.find('.stat.infra-roads').hide();
                }

                if(stats.INFRA_FACIL != null) {
                    this.$el.find('.stat.infra-facilities').show();
                    this.$el.find('.stat.infra-facilities .number .variable').html(
                        this.numberWithCommas(Math.round(stats.INFRA_FACIL * 100))
                    );
                } else {
                    this.$el.find('.stat.infra-facilities').hide();
                }

                if(stats.INFRA_EMERG != null) {
                    this.$el.find('.stat.infra-emergency').show();
                    this.$el.find('.stat.infra-emergency .number .variable').html(
                        this.numberWithCommas(Math.round(stats.INFRA_EMERG * 100))
                    );
                } else {
                    this.$el.find('.stat.infra-emergency').hide();
                }

                if(stats.INFRA_COMM != null) {
                    this.$el.find('.stat.infra-community').show();
                    this.$el.find('.stat.infra-community .number .variable').html(
                        this.numberWithCommas(Math.round(stats.INFRA_COMM))
                    );
                } else {
                    this.$el.find('.stat.infra-community').hide();
                }

                if(stats.CLIMATE_VUL != null) {
                    this.$el.find('.stat.climate-vulnerability').show();
                    this.$el.find('.stat.climate-vulnerability .number .variable').html(
                        this.numberWithCommas(Math.round(stats.CLIMATE_VUL * 100))
                    );
                } else {
                    this.$el.find('.stat.climate-vulnerability').hide();
                }

                if(stats.HOUSE_DENS != null) {
                    this.$el.find('.stat.house-density').show();
                    this.$el.find('.stat.house-density .number .variable').html(
                        this.numberWithCommas(Math.round(stats.HOUSE_DENS * 100))
                    );
                } else {
                    this.$el.find('.stat.house-density').hide();
                }

                if(stats.REEF_AREA != null) {
                    this.$el.find('.stat.reef-area').show();
                    this.$el.find('.stat.reef-area .number .variable').html(
                        this.numberWithCommas(Math.round(stats.REEF_AREA))
                    );
                } else {
                    this.$el.find('.stat.reef-area').hide();
                }

                if(stats.MANG_AREA != null) {
                    this.$el.find('.stat.mangrove-area').show();
                    this.$el.find('.stat.mangrove-area .number .variable').html(
                        this.numberWithCommas(Math.round(stats.MANG_AREA))
                    );
                } else {
                    this.$el.find('.stat.mangrove-area').hide();
                }

                if(stats.GRASS_AREA != null) {
                    this.$el.find('.stat.grass-area').show();
                    this.$el.find('.stat.grass-area .number .variable').html(
                        this.numberWithCommas(Math.round(stats.GRASS_AREA))
                    );
                } else {
                    this.$el.find('.stat.grass-area').hide();
                }

                if(stats.MANG_CHNG != null) {
                    this.$el.find('.stat.mangrove-change').show();
                    var changeText;
                    if(stats.MANG_CHNG < 0) {
                        changeText = "Net Loss";
                    } else if(stats.MANG_CHNG > 0) {
                        changeText = "Net Gain"
                    } else {
                        changeText = "No Change"
                    }
                    this.$el.find('.stat.mangrove-change .number .variable').html(
                        changeText
                    );
                } else {
                    this.$el.find('.stat.mangrove-change').hide();
                }

            },

            changeAdminScenarioClick: function(e) {
                var self = this;

                // change active state of stats and get the layer id to turn on
                var layer = $(e.currentTarget).closest('.stat').data('layer');
                this.$el.find('#admin-pane .stat.active').removeClass('active');
                $(e.currentTarget).closest('.stat').addClass('active');

                // set visible layer to new state - refresh layer to update
                this.adminVisualizationLayer.setVisibleLayers([layer]);
                this.adminVisualizationLayer.refresh();

                // update state with newly selected stat
                var classList = $(e.currentTarget).closest('.stat').attr('class').split(/\s+/);
                $.each(classList, function(index, item) {
                    if(item != 'stat' && item != 'active') {
                        self.state = self.state.setAdminVariable(item);
                    }
                });
            },

            // Change the storm return period and update the facts to match
            changePeriod: function() {
                //http://stackoverflow.com/a/2901298
                var cap = {};
                if (this.provider === 'mangroves') {                  
                    cap.people = this.dataMangrove[this.region]['E2E1_DIF_' + this.period + '_PF'];
                    cap.capital = this.dataMangrove[this.region]['E2E1_DIF_' + this.period + '_BCF'];
                    cap.area = 0;
                } else if (this.provider === 'coral') {
                    cap.people = this.data[this.region]['E2E1_DIF_' + this.period + '_PF'];
                    cap.capital = this.data[this.region]['E2E1_DIF_' + this.period + '_BCF'];
                    cap.area = this.data[this.region]['E2E1_DIF_' + this.period + '_AF'];
                }


                this.$el.find('.stat.people .number .variable').html(
                    this.numberWithCommas(Math.round(cap.people))
                );
                this.$el.find('.stat.capital .number .variable').html(
                    this.numberWithCommas(Math.round(cap.capital / 1000000))
                );
                this.$el.find('.stat.area .number .variable').html(
                    this.numberWithCommas(Math.round(cap.area))
                );

            },

            // format a number with commas
            numberWithCommas: function(number) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            },

            // Change the default region.  If global, zoom to the full extent and show
            // data for all countries.  If regional, zoom to the country based on the
            // bookmark in the extent-bookmarks.json file and hide data for all other
            // countries
            changeRegion: function(e) {
                this.region = this.$el.find('#ncp-select-region').val();
                if(!this.region) {
                    this.region = this.regionJSON.defaultRegion;
                }
                console.log(this.region);

                // Show/hide the download country summary button
                if (this.region === 'Global') {
                    this.$el.find('.js-getSnapshot').hide();
                    this.$el.find('.js-getdata').show();
                } else {
                    this.$el.find('.js-getSnapshot').show();
                    this.$el.find('.js-getdata').hide();
                }

                if(this.adminUnitsLayer) {
                    this.$el.find('.admin-name').html(this.region);
                    this.adminUnitsLayer.clearSelection();
                }

                var regionExtent;
                var extent;
                if (this.provider === 'mangroves' && this.countryConfig[this.region].EXTENT_MANGROVES) {
                    regionExtent = this.countryConfig[this.region].EXTENT_MANGROVES;
                } else {
                    regionExtent = this.countryConfig[this.region].EXTENT;
                }
                
                // Set the zoom extent
                if (this.region === 'Global' && this.provider === 'coral') {
                    var initialExtent = this.app.regionConfig.initialExtent;
                    extent = new Extent(
                        initialExtent[0],
                        initialExtent[1],
                        initialExtent[2],
                        initialExtent[3]
                    );
                } else {
                    extent = new Extent(
                        regionExtent[0],
                        regionExtent[1],
                        regionExtent[2],
                        regionExtent[3]
                    );
                }

                this.map.setExtent(extent, true);

                if(this.regionJSON.hasNCP) {
                    this.updateLayers();
                }
            },

            updateLayers: function(e) {
                var layerDefs = [];
                this.period = this.$el.find('input[name=storm' + this.app.paneNumber +
                        ']:checked').val();
                this.region = this.$el.find('#ncp-select-region').val();
                // this.layer = this.$el.find('.stat.active').data('layer');

                switch (this.layer) {
                    case 'people':
                        this.variable = 'PF';
                        break;
                    case 'capital':
                        this.variable = 'BCF';
                        break;
                    case 'area':
                        this.variable = 'AF';
                        break;
                }

                this.layerID = this.layerLookup[this.provider][this.period][this.layer];
                // Set the data extent
                if (this.region === 'Global') {
                    layerDefs[this.layerID] = ''; //this.activeCountries;
                } else if (this.region === 'US/Puerto Rico') {
                    layerDefs[this.layerID] = 'COUNTRY=\'United States & Puerto Rico\'';
                } else {
                    layerDefs[this.layerID] = 'COUNTRY=\'' + this.region + '\'';
                }
                this.coastalProtectionLayer.setLayerDefinitions(layerDefs, true);

                this.coastalProtectionLayer.setVisibleLayers([this.layerID]);

                this.changePeriod();

                this.state = this.state.setRegion(this.region);
                this.state = this.state.setPeriod(this.period);
                this.state = this.state.setLayer(this.layer);
                this.state = this.state.setVariable(this.variable);

                this.coastalProtectionLayer.refresh();

                this.updateChart();
            },

            // Render the plugin DOM
            render: function() {
                var self = this;
                this.appDiv = new ContentPane({
                    style: 'padding:0; color:#000; flex:1; display:flex; flex-direction:column;}'
                });
                this.id = this.appDiv.id;
                $(dom.byId(this.container)).addClass('sty_flexColumn');
                this.$el.html(this.appDiv.domNode);
                // Get html from content.html, prepend appDiv.id to html element id's,
                // and add to appDiv
                var idUpdate = this.pluginTmpl({
                    global: this.data[this.region],
                    referenceLayers: this.referenceLayers,
                    regionsCoral: this.data,
                    regionsMangrove: this.dataMangrove,
                    region: this.region,
                    hasAdmin: this.regionJSON.hasAdmin,
                    hasNCP: this.regionJSON.hasNCP,
                    pane: this.app.paneNumber}).replace(/id='/g, "id='" + this.id);
                this.$el.find('#' + this.id).html(idUpdate);

                this.$el.find('#ncp-select-region').chosen({
                    disable_search_threshold: 20,
                    width: '100%'
                });

                this.$el.find('#chosen-ref-layers').chosen({
                    max_selected_options: 3,
                    width: '100%'
                });

                this.adminOpacitySlider = this.$el.find("#admin-pane #slider").slider({
                    min: 0, 
                    max: 100, 
                    range: "min",
                    animate: true,
                    value: 100
                });

                $(this.container).find('.viewCrsInfoGraphicIcon').on('click', function(c) {
                    TINY.box.show({
                        animate: true,
                        url: self.provider === 'mangroves' ? 'plugins/natural_coastal_protection/infographic_mangroves.html' : 'plugins/natural_coastal_protection/infographic.html',
                        boxid: 'plugin-tiny-box',
                        width: 600,
                        height: 400
                    });
                });

                $(this.container).find('#ncp-pane .info-button').on('click', function(c) {
                    TINY.box.show({
                        animate: true,
                        url: self.provider === 'mangroves' ? 'plugins/natural_coastal_protection/tooltip_mangroves.html' : 'plugins/natural_coastal_protection/tooltip_corals.html',
                        boxid: 'plugin-tiny-box',
                        width: 640,
                        height: 500
                    });
                });

                $(this.container).find('#admin-pane .info-button').on('click', function(c) {
                    TINY.box.show({
                        animate: true,
                        url: 'plugins/natural_coastal_protection/tooltip_admin.html',
                        boxid: 'plugin-tiny-box',
                        width: 640,
                        height: 500
                    });
                });
            },

            // Update radio displays for dummy "benefits from catastrophic storm" radio
            updateRadios: function(e) {
                var RP = ['25RP', '50RP', '100RP'];
                var target = e.currentTarget.value;
                var checked = this.$el.find('input[name=storm' + this.app.paneNumber +
                        ']:checked').val();

                // dummy button checked without sub radio checked
                if(target == 'BCS' && checked == 'ANN') {
                    this.$el.find('input#RP25-option').click();
                }

                // one of the rps was selected
                if(RP.includes(target)) {
                    this.$el.find('input#BCS-option').prop('checked', true);
                }

                // ANN selected
                if(target == "ANN") {
                    this.$el.find('input#BCS-option').prop('checked', false);
                }
            },

            // Render the D3 Chart
            renderChart: function() {
                var self = this;

                var $chartContainer = this.$el.find('.chartContainer');

                // handle mobile wrapper being larger
                var chartMaxWidth = $chartContainer.css('max-width').substring(0, $chartContainer.css('max-width').length - 2);
                var chartSetWidth = $chartContainer.width();

                var chartWidth = chartSetWidth > chartMaxWidth ? chartMaxWidth : chartSetWidth;

                this.chart.position.width = (chartWidth - 10) -
                    this.chart.position.margin.left - this.chart.position.margin.right;

                // Our x values are always the same.  Treat them as ordinal and hard code them here
                this.chart.x = d3.scale.ordinal()
                    .domain([0, 10, 25, 50, 100])
                    .rangePoints([0, this.chart.position.width]);

                // The x-axis for the bar chart is also ordinal with two values
                this.chart.barx = d3.scale.ordinal()
                    .domain(['Present', 'Reef Loss'])
                    .rangeRoundBands([0, this.chart.position.width], 0.15);

                this.chart.y = d3.scale.linear()
                    .range([this.chart.position.height - 20, 0]);

                this.chart.xAxis = d3.svg.axis()
                    .scale(this.chart.x)
                    .orient('bottom');

                this.chart.barxAxis = d3.svg.axis()
                    .scale(this.chart.barx)
                    .tickFormat(function(d) {
                        return d;
                    })
                    .orient('bottom');

                this.chart.yAxis = d3.svg.axis()
                    .scale(this.chart.y)
                    .orient('left').ticks(5);

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

                this.chart.svg = d3.selectAll($chartContainer.toArray())
                    .append('svg')
                        .attr('width', this.chart.position.width +
                                this.chart.position.margin.left +
                                this.chart.position.margin.right
                        )
                        .attr('height', this.chart.position.height +
                                this.chart.position.margin.top +
                                this.chart.position.margin.bottom
                        )
                    .append('g')
                        .attr('transform', 'translate(' +
                                this.chart.position.margin.left + ',' +
                                this.chart.position.margin.right + ')'
                        );

                // Add a chart background object that can be styled separately
                this.chart.svg.append('rect')
                    .attr('class', 'chart-area')
                    .attr('width', this.chart.position.width)
                    .attr('height', this.chart.position.height - 20)
                    .attr('fill', '#f6f6f6');

                // Add the xaxis
                this.chart.svg.append('g')
                    .attr('opacity', 0)
                    .attr('class', 'xaxis')
                    .attr('transform', 'translate(0,' +
                            (this.chart.position.height - 20) + ')')
                    .call(this.chart.xAxis);

                // Add the xaxis for the bar chart
                this.chart.svg.append('g')
                    .attr('opacity', 1)
                    .attr('class', 'barxaxis')
                    .attr('transform', 'translate(0,' +
                            (this.chart.position.height - 20) + ')')
                    .call(this.chart.barxAxis);

                // Add the x-axis label
                this.chart.svg.append('text')
                    .attr('class', 'xaxis-label')
                    .attr('opacity', 0)
                    .attr('text-anchor', 'middle')
                    .attr('transform', 'translate(' +
                            (this.chart.position.width / 2) + ',' +
                            (this.chart.position.height + 20) + ')'
                    )
                    .text('Storm Return Period');

                // Add the y-axis label
                this.chart.svg.append('text')
                    .attr('class', 'yaxis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', 0 - this.chart.position.margin.left + 12)
                    .attr('x', 0 - (this.chart.position.height / 2))
                    .attr('text-anchor', 'middle')
                    .text('People at Risk (No.)');

                this.chart.svg.append('g')
                    .attr('class', 'yaxis')
                    .call(this.chart.yAxis);

                // Add chart legend
                this.chart.legend = this.chart.svg.append('g')
                    .attr('transform', 'translate(0,210)')
                    .attr('class', 'chart-legend')
                    .attr('opacity', 0);

                this.chart.legend.append('rect')
                    .attr('width', '25')
                    .attr('height', '15')
                    .attr('x', '5')
                    .attr('fill', '#31B91B');

                this.chart.col1 = this.chart.legend.append('text')
                    .attr('class', 'col-1')
                    .text('Present')
                    .attr('x', '32')
                    .attr('y', '11');

                this.chart.legend.append('rect')
                    .attr('width', '25')
                    .attr('height', '15')
                    .attr('x', '5')
                    .attr('y', '18')
                    .attr('fill', '#8465E6');

                this.chart.col2 = this.chart.legend.append('text')
                    .attr('class', 'col-2')
                    .text('Reef Loss')
                    .attr('x', '32')
                    .attr('y', '29');

                // Initialize chart data
                this.addChartPoints();


            },

            // Initialize the chart points with empty values
            addChartPoints: function() {
                var self = this;
                this.chart.data = {};
                this.chart.data.current = {};
                this.chart.data.current.x = [0, 10, 25, 50, 100];
                this.chart.data.current.y = [0, 0, 0, 0, 0];
                this.chart.data.current.xy = [];

                this.chart.data.scenario = {};
                this.chart.data.scenario.x = [0, 10, 25, 50, 100];
                this.chart.data.scenario.y = [0, 0, 0, 0, 0];
                this.chart.data.scenario.xy = [];

                // Create an array of xy point data for the current scenario
                for (var i = 0; i < this.chart.data.current.x.length; i++) {
                    this.chart.data.current.xy.push(
                        {
                            x: this.chart.data.current.x[i],
                            y: this.chart.data.current.y[i]
                        }
                    );
                }

                // Create an array of xy point data for the 1m loss scenario
                for (var j = 0; j < this.chart.data.scenario.x.length; j++) {
                    this.chart.data.scenario.xy.push(
                        {
                            x: this.chart.data.scenario.x[j],
                            y: this.chart.data.scenario.y[j]
                        }
                    );
                }

                // Attach the 1m loss data
                this.chart.svg
                    .data([this.chart.data.scenario.xy])
                    .append('path')
                    .attr('opacity', 0)
                    .attr('class', 'area-scenario')
                    .attr('d', this.chart.area.scenario);

                // Attach the current scenario data
                this.chart.svg
                    .data([this.chart.data.current.xy])
                    .append('path')
                    .attr('opacity', 0)
                    .attr('class', 'area-current')
                    .attr('d', this.chart.area.current);

                // Create an interpolation line between points
                this.chart.svg
                    .append('path')
                    .attr('class', 'line current')
                    .attr('opacity', 0)
                    .attr('d', this.chart.valueline(this.chart.data.current.xy));

                this.chart.pointscurrent = this.chart.svg.append('g')
                    .attr('class', 'points-current');

                // Add circles for each current scenario point and show value on mouseover
                this.chart.pointscurrent.selectAll('circle')
                    .data(this.chart.data.current.xy)
                    .enter().append('circle')
                    .attr('opacity', 0)
                    .attr('class', 'info-tooltip')
                    .attr('cx', function(d) { return self.chart.x(d.x); })
                    .attr('cy', function(d) { return self.chart.y(d.y); })
                    .attr('r', 3.5);

                this.chart.svg
                    .append('path')
                    .attr('opacity', 0)
                    .attr('class', 'line scenario')
                    .attr('d', this.chart.valueline(this.chart.data.scenario.xy));

                this.chart.pointsscenario = this.chart.svg.append('g')
                    .attr('class', 'points-scenario');

                // Add circles for each 1m loss scenario point and show value on mouseover
                this.chart.pointsscenario.selectAll('circle')
                    .data(this.chart.data.scenario.xy)
                    .enter().append('circle')
                    .attr('opacity', 0)
                    .attr('class', 'info-tooltip')
                    .attr('cx', function(d) { return self.chart.x(d.x); })
                    .attr('cy', function(d) { return self.chart.y(d.y); })
                    .attr('r', 3.5);

                // Bar chart
                var bardata = [
                    {x: 'Present', y: 0},
                    {x: 'Reef Loss', y: 0}
                ];

                this.chart.svg.selectAll('.bar')
                    .data(bardata)
                    .enter().append('rect')
                    .attr('opacity', 0)
                    .attr('class', 'bar info-tooltip')
                    .attr('x', function(d) { return self.chart.barx(d.x); })
                    .attr('width', 30)
                    .attr('y', function(d) { return self.chart.y(d.y); })
                    .attr('title', function(d) {
                        return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    });

                this.updateChart();

            },

            // Set the chart data to match the current variable
            updateChart: function() {
                var self = this;
                // Built Capital should be divided by 1 million
                var division = 1;
                if (this.variable === 'BCF') {
                    division = 1000000;
                }

                var annual = false;
                if (this.period === 'ANN') {
                    annual = true;
                }

                if (this.provider === 'mangroves') {
                    this.chart.barx.domain(['2010 Mangroves', 'No Mangroves']);

                    this.chart.svg.select('.col-1')
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 0)
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 1)
                        .text("2010 Mangroves")

                    this.chart.svg.select('.col-2')
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 0)
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 1)
                        .text('No Mangroves');

                } else {
                    this.chart.barx.domain(['Present', 'Reef Loss']);

                    this.chart.svg.select('.col-1')
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 0)
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 1)
                        .text('Present');

                    this.chart.svg.select('.col-2')
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 0)
                        .transition().duration(this.transitionsEnabled ? 600 : 0)
                        .style('opacity', 1)
                        .text('Reef Loss');
                }
                

                // Update the  y-axis label to match the current variable selected
                var text = '';
                if (this.variable === 'BCF') {
                    text = 'Built Capital at Risk ($Millions)';
                } else if (this.variable === 'PF') {
                    text = 'People at Risk (No.)';
                } else if (this.variable === 'AF') {
                    text = 'Area at Risk (sq km)';
                }

                this.chart.svg.select('.yaxis-label')
                    .transition().duration(this.transitionsEnabled ? 600 : 0)
                    .style('opacity', 0)
                    .transition().duration(this.transitionsEnabled ? 600 : 0)
                    .style('opacity', 1)
                    .text(text);

                // Get the data for the scenario from the data.json file and divide
                // into the correct units if specified.  Default is 1
                this.chart.data.current.xy = [];
                var data = this.provider === 'coral' ? this.data[this.region] : this.dataMangrove[this.region];
                this.chart.data.current.y = [
                    data['E1_ANN_' + this.variable] / division,
                    data['E1_10RP_' + this.variable] / division,
                    data['E1_25RP_' + this.variable] / division,
                    data['E1_50RP_' + this.variable] / division,
                    data['E1_100RP_' + this.variable] / division
                ];

                // Create array of xy values for drawing chart points
                for (var i = 0; i < this.chart.data.current.x.length; i++) {
                    this.chart.data.current.xy.push(
                        {
                            x: this.chart.data.current.x[i],
                            y: this.chart.data.current.y[i]
                        }
                    );
                }

                this.chart.data.scenario.xy = [];
                this.chart.data.scenario.y = [
                    data['E2_ANN_' + this.variable] / division,
                    data['E2_10RP_' + this.variable] / division,
                    data['E2_25RP_' + this.variable] / division,
                    data['E2_50RP_' + this.variable] / division,
                    data['E2_100RP_' + this.variable] / division
                ];

                for (var j = 0; j < this.chart.data.scenario.x.length; j++) {
                    this.chart.data.scenario.xy.push(
                        {
                            x: this.chart.data.scenario.x[j],
                            y: this.chart.data.scenario.y[j]
                        }
                    );
                }

                var bary;
                var bary1m;

                // Set the data for the bar chart
                if (this.variable === 'BCF') {
                    bary = data.E1_ANN_BCF / division;
                    bary1m = data.E2_ANN_BCF / division;
                } else if (this.variable === 'PF') {
                    bary = data.E1_ANN_PF / division;
                    bary1m = data.E2_ANN_PF / division;
                } else if (this.variable === 'AF') {
                    bary = data.E1_ANN_AF / division;
                    bary1m = data.E2_ANN_AF / division;
                }

                var bardata = [];
                if (this.provider === 'coral') {
                    bardata.push({x: 'Present', y: bary});
                    bardata.push({x: 'Reef Loss', y: bary1m});
                } else {
                    bardata.push({x: '2010 Mangroves', y: bary});
                    bardata.push({x: 'No Mangroves', y: bary1m});
                }


                if (this.period === 'ANN') {
                    // Set the y-axis for the bar chart
                    this.chart.y.domain([0, bary1m]);
                } else {
                    // Set the y-axis for the line chart
                    this.chart.y.domain([0, d3.max(this.chart.data.scenario.y)]);
                    // Add a DOM class to the active point and legend text so the currently
                    // selected storm return period can be bolded in the chart
                    if (this.period === '25RP') {
                        this.chart.svg.selectAll('.xaxis .tick')
                            .classed('current', false).each(function(d, i) {
                                if (d === 25) {
                                    d3.select(this)
                                        .classed('current', true);
                                }
                            });
                    }
                    if (this.period === '50RP') {
                        this.chart.svg.selectAll('.xaxis .tick')
                            .classed('current', false).each(function(d, i) {
                                if (d === 50) {
                                    d3.select(this)
                                        .classed('current', true);
                                }
                            });
                    }
                    if (this.period === '100RP') {
                        this.chart.svg.selectAll('.xaxis .tick')
                            .classed('current', false).each(function(d, i) {
                                if (d === 100) {
                                    d3.select(this)
                                        .classed('current', true);
                                }
                            });
                    }
                }

                // Show and hide as appropriate all the different elements.
                // We animate these over the course of 1200ms
                this.chart.svg.select('.yaxis')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('linear')
                    .call(this.chart.yAxis);

                this.chart.svg.select('.xaxis')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1);
                  
                this.chart.svg.select('.barxaxis')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 1 : 0)
                    .call(this.chart.barxAxis);

                this.chart.svg.select('.xaxis-label')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1);

                this.chart.legend
                    .transition().delay(this.transitionsEnabled ? 750 : 0).duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1);

                this.chart.svg.select('.line.current')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('d', this.chart.valueline(this.chart.data.current.xy));

                this.chart.svg.select('.area-current')
                    .data([this.chart.data.current.xy])
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('d', this.chart.area.current);

                // Update the chart point data and adjust point position on chart to match
                this.chart.pointscurrent.selectAll('circle')
                    .data(this.chart.data.current.xy)
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('title', function(d) {
                        return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    })
                    .attr('cx', function(d) { return self.chart.x(d.x); })
                    .attr('cy', function(d) { return self.chart.y(d.y); })
                     .attr('r', function(d) {
                        var period;
                        if (self.period === '25RP') {
                            period = 25;
                        } else if (self.period === '100RP') {
                            period = 100;
                        }
                        if (d.x === period) {
                           return 5;
                        } else {
                            return 3.5;
                        }
                    });

                // Update the position of the interpolation line to match the new point position
                this.chart.svg.select('.line.scenario')
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('d', this.chart.valueline(this.chart.data.scenario.xy));

                this.chart.svg.select('.area-scenario')
                    .data([this.chart.data.scenario.xy])
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('d', this.chart.area.scenario);

                this.chart.pointsscenario.selectAll('circle')
                    .data(this.chart.data.scenario.xy)
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 0 : 1)
                    .attr('title', function(d) {
                        return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    })
                    .attr('cx', function(d) { return self.chart.x(d.x); })
                    .attr('cy', function(d) { return self.chart.y(d.y); })
                    .attr('r', function(d) {
                        var period;
                        if (self.period === '25RP') {
                            period = 25;
                        } else if (self.period === '100RP') {
                            period = 100;
                        }
                        if (d.x === period) {
                           return 5;
                        } else {
                            return 3.5;
                        }
                    });

                this.chart.svg.selectAll('.bar')
                    .data(bardata)
                    .transition().duration(this.transitionsEnabled ? 1200 : 0).ease('sin-in-out')
                    .attr('opacity', annual ? 1 : 0)
                    .attr('width', this.chart.barx.rangeBand())
                    
                    .attr('data-layer', function(d) {
                        return d.x;
                    })
                    // TODO: Don't animate title
                    .attr('title', function(d) {
                        return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    })
                    .attr('x', function(d) { return self.chart.barx(d.x); })
                    .attr('y', function(d) { return self.chart.y(d.y); })
                    .attr('height', function(d) {
                        return self.chart.position.height - 20 - self.chart.y(d.y);
                    });
            },

            // Download the pdf report for the current region
            printReport: function() {
                if (this.provider === 'mangroves') {
                    this.$el.parent('.sidebar').find('.plugin-print').trigger('click');
                } else {
                    window.open(this.countryConfig[this.region].SNAPSHOT, '_blank');
                }
                return false;
            },

            prePrintModal: function (preModalDeferred, $printSandbox, $modalSandbox, mapObject) {
                var self = this;
                this.$el.find('.js-getSnapshot').prop('disabled', true);
                var currentLayer = this.layer;
                $printSandbox.html(_.template(this.printMangroveTmpl({
                    region: this.region,
                    people: this.numberWithCommas(Math.round(this.dataMangrove[this.region]['E2E1_DIF_' + 'ANN' + '_PF'])),
                    capital: this.numberWithCommas(Math.round(this.dataMangrove[this.region]['E2E1_DIF_' + 'ANN' + '_BCF'] / 1000)),
                    ANN_FLOOD_AVERT_BIL: this.dataMangrove[this.region]['ANN_FLOOD_AVERT_BIL'],
                    ANN_FLOOD_AVRT_PER: this.dataMangrove[this.region]['ANN_FLOOD_AVRT_PER']
                })));
                $printSandbox.find('img').on('load', function(img) {
                    $(img.target).addClass('loaded');
                });
                this.transitionsEnabled = false;
                
                this.layer = 'people';
                this.updateLayers();
                $printSandbox.find('.graph.people svg').html(this.chart.svg.node().cloneNode(true)).height('2.2in').width('3.7in');
                $printSandbox.find('.graph.people svg .yaxis-label').attr({
                    transform: '',
                    x: '140',
                    y: '-10'
                });
                this.layer = 'capital';
                this.updateLayers();
                
                setTimeout(function() {
                    $printSandbox.find('.graph.capital svg').html(self.chart.svg.node().cloneNode(true)).height('2.2in').width('3.7in');
                    $printSandbox.find('.graph.capital svg .yaxis-label').attr({
                    transform: '',
                    x: '140',
                    y: '-10'
                });
                    self.transitionsEnabled = true;
                    self.layer = currentLayer;
                    self.updateLayers();
                    var imageCount = $printSandbox.find('img').length;
                    var loadedImages = $printSandbox.find('img.loaded').length;
                    if (loadedImages === imageCount) {
                        preModalDeferred.resolve();
                        self.$el.find('.js-getSnapshot').prop('disabled', false);
                    } else {
                        $printSandbox.find('img').on('load', function(img) {
                            loadedImages += 1;
                            if (loadedImages === imageCount) {
                                preModalDeferred.resolve();
                                self.$el.find('.js-getSnapshot').prop('disabled', false);
                            }
                        });
                    }
                }, 1);
                
            },

            // Get the requested template from the template file based on id.
            // We currently only have one template for this plugin
            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            }

        });
    }
);

