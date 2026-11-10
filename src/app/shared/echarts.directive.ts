import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  NgZone,
  inject,
} from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Only the chart types and components this app actually uses are bundled.
// Importing the whole `echarts` package added ~1 MB to the initial bundle.
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  GraphicComponent,
  CanvasRenderer,
]);

@Directive({ selector: '[appEcharts]' })
export class EchartsDirective implements OnChanges, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  @Input('appEcharts') options: any = null;

  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnChanges(): void {
    if (!this.options) return;

    this.zone.runOutsideAngular(() => {
      if (!this.chart) {
        this.chart = echarts.init(this.el.nativeElement);
        this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
        this.resizeObserver.observe(this.el.nativeElement);
      }
      this.chart.setOption(this.options, true);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
    this.chart = null;
  }
}
