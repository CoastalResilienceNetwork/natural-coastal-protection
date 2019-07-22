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
                    adminOpacity: 100,
                    coralVisibility: false,
                    mangroveVisibility: false,
                    adminVisibility: false,
                    fromShare: false,
                    floodPolyVisibility: true,
                    floodWithVisibility: false,
                    floodWithoutVisibility: false,
                    floodOpacity: 100
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

            setFloodWithVisibility: function(floodWithVisibility) {
                return this.clone({
                    floodWithVisibility: floodWithVisibility
                });
            },

            getFloodWithVisibility: function() {
                return this.savedState.floodWithVisibility;
            },

            setFloodWithoutVisibility: function(floodWithoutVisibility) {
                return this.clone({
                    floodWithoutVisibility: floodWithoutVisibility
                });
            },

            getFloodWithoutVisibility: function() {
                return this.savedState.floodWithoutVisibility;
            },

            setAdminVisibility: function(adminVisibility) {
                return this.clone({
                    adminVisibility: adminVisibility
                });
            },

            getAdminVisibility: function() {
                return this.savedState.adminVisibility;
            },

            setAdminOpacity: function(adminOpacity) {
                return this.clone({
                    adminOpacity: adminOpacity
                });
            },

            getAdminOpacity: function() {
                return this.savedState.adminOpacity;
            },

            setFloodOpacity: function(floodOpacity) {
                return this.clone({
                    floodOpacity: floodOpacity
                });
            },

            getFloodOpacity: function() {
                return this.savedState.floodOpacity;
            },

            setFloodPolyVisibility: function(floodPolyVisibility) {
                return this.clone({
                    floodPolyVisibility: floodPolyVisibility
                });
            },

            getFloodPolyVisibility: function() {
                return this.savedState.floodPolyVisibility;
            },

            setFromShare: function(fromShare) {
                return this.clone({
                    fromShare: fromShare
                });
            },

            getFromShare: function() {
                return this.savedState.fromShare;
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
