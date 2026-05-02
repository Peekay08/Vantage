let pColor; //color of percent
let percentTextColor; // border color
    
    function createChart(chartId, percent){
        let remainder;
        let spacing;
        let borderRadius;
        if (percent <= 100){
            remainder = 100 - percent;
            spacing = 3;
            borderRadius = 3;
        }else{
            remainder = 0;
            spacing = 0;
            borderRadius = 0;
        };
    
        const ratio = [percent,remainder];
        if(percent > 100){
            pColor = '#990030e6'; //deep red
            percentTextColor = '#990030';
        }else if (percent >= 75) {
            pColor = '#bf405980'; //red
            percentTextColor = '#bf4059';
        } else if (percent >= 45) {
            pColor = '#bf804080'; //yellow
            percentTextColor = '#bf8040';
        } else {
            pColor = '#20605280';  //green
            percentTextColor = '#206052';
        }; 
        
        const percentText = percent + '%';
        const counter = {
            id: 'counter',
            beforeDraw(chart, args, options) {
                const { ctx, chartArea: { top, right, bottom, left, width, height } } = chart;
                ctx.save();
                ctx.font = options.fontSize + "px " + options.fontFamily;
                ctx.textAlign = 'center';
                ctx.fillStyle = options.fontColor;
                ctx.fillText(percentText, (width / 2), (height / 2) + (options.fontSize * 0.25));

            }
        };

    const ctx = document.getElementById(chartId);
        return new Chart(ctx, {
        type: 'pie',
        data: {
                labels: [
                    'Occupied',
                    'Vacant',
                ],
                datasets: [{
                    data: ratio,
                    backgroundColor: [
                        pColor,'#80808033',
                    ],
                    borderColor: [
                        pColor,'#80808033',
                    ],
                    borderWidth: 1,
                    borderRadius,
                    spacing,
                }],

            },
        options: {
            cutout: '87%',
            plugins: {
                legend: {
                    display: false,
                },
                counter: {
                    fontColor: percentTextColor,
                    fontSize: 30,
                    fontFamily: 'sans-serif',
                },
            },
            responsive: true,
        },
        plugins: [counter],

    },
);
}

    const chartA = createChart('chartA', 28);
    const chartB = createChart('chartB', 80);
    const chartC = createChart('chartC', 45);
    const chartD = createChart('chartD', 70);
    const chartE = createChart('chartE', 50);
    const chartF = createChart('chartF', 110);
  