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
                    coralVisibility: false,
                    mangroveVisibility: false,
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

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
