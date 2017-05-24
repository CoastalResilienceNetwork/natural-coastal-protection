'use strict';
define([
        'dojo/_base/declare',
        'underscore'
    ],
    function(declare, _) {

        var State = declare(null, {
            constructor: function(data) {
                this.savedState = _.defaults({}, data, {

                });
            },

            getState: function() {
                console.log(this.savedState);
                return this.savedState;
            },

            setRegion: function(region) {
                return this.clone({
                    region: region
                });
            },

            getRegion: function() {
                return this.savedState.region || 'Global';
            },

            setPeriod: function(period) {
                return this.clone({
                    period: period
                });
            },

            getPeriod: function() {
                return this.savedState.period || 'ANN';
            },

            setLayer: function(layer) {
                return this.clone({
                    layer: layer
                });
            },

            getLayer: function() {
                return this.savedState.layer || 'people';
            },

            setVariable: function(variable) {
                return this.clone({
                    variable: variable
                });
            },

            getVariable: function() {
                return this.savedState.variable || 'PF';
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
