'use strict';
define([
        'dojo/_base/declare',
        'underscore'
    ],
    function(declare, _) {

        var State = declare(null, {
            constructor: function(data) {
                this.savedState = _.defaults({}, data, {
                    provider: 'coral',
                    region: 'Global',
                    period: 'ANN',
                    layer: 'people',
                    variable: 'PF',
                    adminReferenceLayers: [],
                    adminUnit: false,
                    adminVariable: 'population-flood',
                    coralVisibility: false,
                    mangroveVisibility: false,
                    adminVisibility: false,
                    floodExtentVisibility: false
                });
            },

            getState: function() {
                return this.savedState;
            },

            setRegion: function(region) {
                return this.clone({
                    region: region
                });
            },

            getProvider: function() {
                return this.savedState.provider;
            },

            setProvider: function(provider) {
                return this.clone({
                    provider: provider
                });
            },

            getRegion: function() {
                return this.savedState.region;
            },

            setPeriod: function(period) {
                return this.clone({
                    period: period
                });
            },

            getPeriod: function() {
                return this.savedState.period;
            },

            setLayer: function(layer) {
                return this.clone({
                    layer: layer
                });
            },

            getLayer: function() {
                return this.savedState.layer;
            },

            setVariable: function(variable) {
                return this.clone({
                    variable: variable
                });
            },

            getVariable: function() {
                return this.savedState.variable;
            },

            setAdminReferenceLayers: function(layers) {
                return this.clone({
                    adminReferenceLayers: layers
                });
            },

            getAdminReferenceLayers: function() {
                return this.savedState.adminReferenceLayers;
            },

            setAdminUnit: function(unit) {
                return this.clone({
                    adminUnit: unit
                });
            },

            getAdminUnit: function() {
                return this.savedState.adminUnit;
            },

            setAdminVariable: function(variable) {
                return this.clone({
                    adminVariable: variable
                });
            },

            getAdminVariable: function() {
                return this.savedState.adminVariable;
            },

            setCoralVisibility: function(coralVisibility) {
                return this.clone({
                    coralVisibility: coralVisibility
                });
            },

            getCoralVisibility: function() {
                return this.savedState.coralVisibility;
            },

            setMangroveVisibility: function(mangroveVisibility) {
                return this.clone({
                    mangroveVisibility: mangroveVisibility
                });
            },

            getMangroveVisibility: function() {
                return this.savedState.mangroveVisibility;
            },

            setAdminVisibility: function(adminVisibility) {
                return this.clone({
                    adminVisibility: adminVisibility
                });
            },


            getAdminVisibility: function() {
                return this.savedState.adminVisibility;
            },

            getFloodExtentVisibility: function() {
                return this.savedState.floodExtentVisibility;
            },

            setFloodExtentVisibility: function(floodExtentVisibility) {
                return this.clone({
                    floodExtentVisibility: floodExtentVisibility
                });
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
