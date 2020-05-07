import 'babel-polyfill';
import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import DateTimePicker from 'react-datetime-picker';
import Input, {Size as InputSize} from '@jetbrains/ring-ui/components/input/input';
import ProgressBar from '@jetbrains/ring-ui/components/progress-bar/progress-bar';
import Checkbox from '@jetbrains/ring-ui/components/checkbox/checkbox';


import styles from './app.css';

const COUNTDOWN_TICK_MS = 1000;

const MS_IN_SEC = 1000;
const SEC_IN_MIN = 60;
const MIN_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const MS_IN_MIN = SEC_IN_MIN * MS_IN_SEC;
const SEC_IN_HOUR = SEC_IN_MIN * MIN_IN_HOUR;
const MS_IN_HOUR = MS_IN_SEC * SEC_IN_HOUR;
const MS_IN_DAY = MS_IN_HOUR * HOURS_IN_DAY;


class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi, dashboardApi} = props;

    this.state = {
      isConfiguring: true,
      countdownDateTime: new Date(),
      showSeconds: true
    };

    registerWidgetApi({
      onConfigure: () => this.setState({isConfiguring: true})
    });

    this.initialize(dashboardApi);
  }

  componentDidMount() {
    this.initialize(this.props.dashboardApi);
    setInterval(() =>
      this.setState({time: Date.now()}), COUNTDOWN_TICK_MS);
  }

  initialize(dashboardApi) {
    dashboardApi.readConfig().then(config => {
      if (!config) {
        dashboardApi.enterConfigMode();
        this.setState({isConfiguring: true});
        return;
      }
      this.setState(
        {
          isConfiguring: false,
          countdownDateTime: new Date(config.countdownDateTime),
          countdownTitle: config.countdownTitle,
          totalDiffMs: config.totalDiffMs,
          showSeconds: config.showSeconds && true
        }
      );
    });
  }

  saveConfig = async () => {
    const {
      countdownDateTime,
      countdownTitle,
      totalDiffMs,
      showSeconds
    } = this.state;
    await this.props.dashboardApi.storeConfig(
      {countdownDateTime, countdownTitle, totalDiffMs, showSeconds});
    this.setState({isConfiguring: false});
    this.props.dashboardApi.setTitle(`Time to: ${countdownTitle}`);
  };

  cancelConfig = async () => {
    const {dashboardApi} = this.props;

    const config = await dashboardApi.readConfig();
    if (!config) {
      dashboardApi.removeWidget();
    } else {
      this.setState({isConfiguring: false});
      await this.props.dashboardApi.exitConfigMode();
      this.initialize(dashboardApi);
    }
  };

  changeDateTime = countdownDateTime => {
    const totalDiffMs =
      countdownDateTime - Date.now();
    this.setState({countdownDateTime, totalDiffMs});
  };

  changeCountdownTitle = e => this.setState({
    countdownTitle: e.target.value
  });

  changeShowSeconds = e => this.setState({
    showSeconds: e.target.checked
  });

  renderConfiguration() {
    const countdownTitle =
      this.state.countdownTitle ? this.state.countdownTitle : '';

    return (<div className={styles.widget}>
      <Input
        size={InputSize.FULL}
        placeholder="Enter countdown title"
        onChange={this.changeCountdownTitle}
        value={countdownTitle}
      />
      <DateTimePicker
        onChange={this.changeDateTime}
        value={this.state.countdownDateTime}
      />
      <div className={styles.additionalSettings}>
        <Checkbox
          label={'Show seconds in countdown'}
          checked={this.state.showSeconds}
          onChange={this.changeShowSeconds}
        />
      </div>
      <Panel className={styles.formFooter}>
        <Button
          primary={true}
          onClick={this.saveConfig}
          disabled={countdownTitle === ''}
        >{'Save'}</Button>
        <Button onClick={this.cancelConfig}>{'Cancel'}</Button>
      </Panel>
    </div>);
  }

  getItemStringRepresentation = item => (item.toString().length === 1 ? `0${item}` : item);

  render() {
    const {
      isConfiguring,
      countdownTitle,
      countdownDateTime,
      totalDiffMs,
      showSeconds
    } =
      this.state;

    if (isConfiguring) {
      return this.renderConfiguration();
    }

    let timeDiff =
      Math.abs(countdownDateTime.getTime()) - Date.now();

    timeDiff = timeDiff < MS_IN_SEC ? 0 : timeDiff;

    const itemValueClass = classNames(styles.countdownItemValue, {
      [styles.countdownItemZeroValue]: timeDiff === 0
    });

    const titleClass = classNames(styles.countdownTitle, {
      [styles.countdownZeroTitle]: timeDiff === 0
    });

    const diffDays = Math.floor(timeDiff / MS_IN_DAY);

    const diffHours =
      Math.floor(timeDiff / MS_IN_HOUR) - diffDays * HOURS_IN_DAY;

    const diffMinutes =
      Math.floor(timeDiff / MS_IN_MIN) - diffHours * MIN_IN_HOUR -
      diffDays * HOURS_IN_DAY * MIN_IN_HOUR;

    const diffSeconds =
      Math.floor(timeDiff / MS_IN_SEC) -
      diffMinutes * SEC_IN_MIN -
      diffHours * SEC_IN_HOUR -
      diffDays * HOURS_IN_DAY * SEC_IN_HOUR;

    const progressValue = (totalDiffMs - timeDiff) / totalDiffMs;

    return (
      <div className={styles.widget}>
        <div className={styles.mainPresentationArea}>
          <h1 className={titleClass}>{`Time to: ${countdownTitle}`}</h1>
          <div className={styles.countdownBlockWrapper}>
            <div className={styles.countdownBlock}>
              <div className={styles.countdownItem}>
                <div className={itemValueClass}>
                  {this.getItemStringRepresentation(diffDays)}</div>
                <div className={styles.itemDescription}>{'Days'}</div>
              </div>
              <div className={styles.countdownItem}>
                <div className={itemValueClass}>
                  {this.getItemStringRepresentation(diffHours)}</div>
                <div className={styles.itemDescription}>{'Hours'}</div>
              </div>
              <div className={styles.countdownItem}>
                <div className={itemValueClass}>
                  {this.getItemStringRepresentation(diffMinutes)}</div>
                <div className={styles.itemDescription}>{'Minutes'}</div>
              </div>
              {showSeconds &&
              <div className={styles.countdownItem}>
                <div className={itemValueClass}>
                  {this.getItemStringRepresentation(diffSeconds)}</div>
                <div className={styles.itemDescription}>{'Seconds'}</div>
              </div>}
              <ProgressBar
                value={progressValue}
                className={styles.progressBar}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) =>
  render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  )
);
