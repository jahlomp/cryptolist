import React from 'react';
import {} from 'reactstrap';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';
import { Loading } from '../../../../../components/loading';
import { ResponsiveLine } from '@nivo/line';
import moment from 'moment';

// const colors = ['#F87A0B', '#002626', '#0E4749', '#95C623', '#E6FAFC'];
// const colors = ['#222222', '#474747', '#727272', '#939393', '#bababa']; // greyscale
// const colors = ['#EE8434', '#223843', '#A33B20', '#429321', '#EDD382']; // slightly preferred
// const colors = ['#EE8434', '#335C67', '#A33B20', '#EDD382', '#306B34'];

const CANDLES_QUERY = gql`
  query MarketComparison($currencySymbol: String, $start: Int, $end: Int) {
    currency(currencySymbol: $currencySymbol) {
      id
      markets {
        data {
          id
          marketSymbol
          candles(sort: OLD_FIRST, resolution: _5m, start: $start, end: $end) {
            start
            end
            data
          }
        }
      }
    }
  }
`;

export class MarketComparisonGraphComponent extends React.Component {
  constructor(props) {
    super(props);

    this.findCorrectMarkets = this.findCorrectMarkets.bind(this);
    this.generateDataFromCandles = this.generateDataFromCandles.bind(this);
    this.normalizeData = this.normalizeData.bind(this);
    this.getAllXValues = this.getAllXValues.bind(this);
  }

  findCorrectMarkets(markets, quoteSymbol) {
    return markets.filter(p => p.marketSymbol.endsWith(quoteSymbol.toUpperCase()));
  }

  generateDataFromCandles(candles, marketSymbol) {
    return {
      id: marketSymbol.split(':')[0],
      data: candles.map(candle => ({
        x: candle[0],
        y: candle[1],
      })),
    };
  }

  normalizeData(data) {
    let xValues = this.getAllXValues(data);
    data.map(market => {
      let marketXValues = market.data.map(data => data.x);
      xValues.map(val => {
        if (marketXValues.indexOf(val) === -1) {
          market.data.push({
            x: val,
            y: null,
          });
        }
      });

      market.data.sort((a, b) => (a.x < b.x ? -1 : 1));
    });
  }

  getAllXValues(data) {
    let totalList = [];
    data.map(market => {
      market.data.map(val => {
        if (totalList.indexOf(val.x) === -1) totalList.push(val.x);
      });
    });
    return totalList;
  }

  render() {
    if (!this.props.data.currency)
      return (
        <div className="volume-market line">
          <h4>Exchange price comparison (24 hr)</h4>
          <Loading />
        </div>
      );
    if (!this.props.data.currency.markets) return <div />;

    let markets = this.props.data.currency.markets.data;
    let filteredMarkets = this.findCorrectMarkets(markets, this.props.match.params.quote);
    if (!filteredMarkets.length) return <div />;

    let data = filteredMarkets.map(market => {
      if (market.candles) {
        return this.generateDataFromCandles(market.candles.data, market.marketSymbol);
      }
      return {
        id: market.marketSymbol.split(':')[0],
        data: [],
      };
    });
    this.normalizeData(data);
    return (
      <div className="volume-market line">
        <h4>Exchange price comparison (24 hr)</h4>
        <h5>
          {this.props.match.params.base}/{this.props.match.params.quote}
        </h5>
        <div style={{ height: '21em' }}>
          <ResponsiveLine
            data={data}
            margin={{
              top: 57,
              right: 110,
              bottom: 50,
              left: 60,
            }}
            enableDots={false}
            enableGridX={false}
            minY="auto"
            animate={true}
            motionStiffness={90}
            motionDamping={15}
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'column',
                translateX: 100,
                itemWidth: 80,
                itemHeight: 20,
                symbolSize: 12,
                symbolShape: 'circle',
              },
            ]}
          />
        </div>
      </div>
    );
  }
}

MarketComparisonGraphComponent.propTypes = {
  data: PropTypes.object,
  match: PropTypes.object.isRequired,
};

const withCandles = graphql(CANDLES_QUERY, {
  options: ({ match }) => {
    return {
      variables: {
        currencySymbol: match.params.base,
        start: moment()
          .subtract(1, 'days')
          .utc()
          .unix(),
        end: moment()
          .utc()
          .unix(),
      },
    };
  },
});

export const MarketComparisonGraph = withCandles(MarketComparisonGraphComponent);
