// Team Performance Analytics - Web Integration
// This JavaScript module calculates average points per player for each session
// and integrates with Chart.js for web visualization

// Prevent duplicate class declaration
if (typeof window.TeamPerformanceAnalytics === 'undefined') {
class TeamPerformanceAnalytics {
    constructor() {
        this.chartInstance = null;
    }

    /**
     * Calculate average points per player for each session
     * @param {Array} trainingSessions - Array of training session data
     * @param {Array} athleteSessionData - Array of athlete performance data
     * @returns {Object} Processed analytics data
     */
    calculateTeamPerformanceTrend(trainingSessions, athleteSessionData) {
        console.log('📊 Calculating team performance trends...');
        
        const sessionStats = [];
        
        // Process each training session
        trainingSessions.forEach(session => {
            const sessionId = session.id;
            const sessionName = session.sessionName || 'Training Session';
            
            // Find all athlete data for this session
            const sessionAthletes = athleteSessionData.filter(athlete => 
                athlete.sessionId === sessionId
            );
            
            if (sessionAthletes.length === 0) {
                console.warn(`⚠️ No athlete data found for session: ${sessionName}`);
                return;
            }
            
            // Get sessionDate from athlete data since it's not in training session
            let sessionDate = session.sessionDate;
            if (!sessionDate && sessionAthletes.length > 0) {
                sessionDate = sessionAthletes[0].sessionDate;
            }
            
            // Calculate total points and count participating athletes
            let totalPoints = 0;
            let participatingAthletes = 0;
            
            sessionAthletes.forEach(athlete => {
                // Include all athletes who participated (present, late, or left early)
                const attendance = (athlete.attendance || 'Present').toLowerCase();
                
                if (['present', 'late', 'left early', 'late arrival'].includes(attendance)) {
                    participatingAthletes++;
                    
                    // Add their points (ensure it's a number)
                    const points = parseFloat(athlete.points) || 0;
                    totalPoints += points;
                }
            });
            
            // Calculate average points per player
            if (participatingAthletes > 0) {
                const avgPointsPerPlayer = totalPoints / participatingAthletes;
                
                sessionStats.push({
                    sessionId,
                    sessionName,
                    sessionDate,
                    totalPoints,
                    participatingAthletes,
                    avgPointsPerPlayer: Math.round(avgPointsPerPlayer * 100) / 100
                });
                
                console.log(`📈 ${sessionName}: ${participatingAthletes} athletes, ` +
                           `${totalPoints} total points, ${avgPointsPerPlayer.toFixed(2)} avg per player`);
            }
        });
        
        // Sort by date
        sessionStats.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        
        return {
            sessionStats,
            summary: this.generateSummary(sessionStats)
        };
    }
    
    /**
     * Generate summary statistics
     * @param {Array} sessionStats - Array of session statistics
     * @returns {Object} Summary statistics
     */
    generateSummary(sessionStats) {
        if (sessionStats.length === 0) {
            return null;
        }
        
        const avgPoints = sessionStats.map(s => s.avgPointsPerPlayer);
        const totalAthletes = sessionStats.reduce((sum, s) => sum + s.participatingAthletes, 0);
        const totalPoints = sessionStats.reduce((sum, s) => sum + s.totalPoints, 0);
        
        return {
            totalSessions: sessionStats.length,
            overallAverage: Math.round((avgPoints.reduce((a, b) => a + b, 0) / avgPoints.length) * 100) / 100,
            highestAverage: Math.max(...avgPoints),
            lowestAverage: Math.min(...avgPoints),
            totalAthletesTracked: totalAthletes,
            averageAthletesPerSession: Math.round((totalAthletes / sessionStats.length) * 10) / 10,
            totalPointsScored: totalPoints,
            consistencyScore: this.calculateConsistency(avgPoints)
        };
    }
    
    /**
     * Calculate performance consistency (inverse of coefficient of variation)
     * @param {Array} avgPoints - Array of average points
     * @returns {number} Consistency score (0-100, higher is more consistent)
     */
    calculateConsistency(avgPoints) {
        if (avgPoints.length < 2) return 100;
        
        const mean = avgPoints.reduce((a, b) => a + b, 0) / avgPoints.length;
        const variance = avgPoints.reduce((sum, point) => sum + Math.pow(point - mean, 2), 0) / avgPoints.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Coefficient of variation (CV) = std dev / mean
        const cv = mean > 0 ? standardDeviation / mean : 0;
        
        // Convert to consistency score (100% - CV%), capped at 100
        const consistencyScore = Math.max(0, Math.min(100, (1 - cv) * 100));
        return Math.round(consistencyScore * 10) / 10;
    }

    /**
     * Calculate average points per player across all sessions
     * @param {Array} trainingSessions - Array of training session data
     * @param {Array} athleteSessionData - Array of athlete performance data
     * @returns {Object} Player performance analytics data
     */
    calculatePlayerAveragePoints(trainingSessions, athleteSessionData) {
        console.log('👥 Calculating average points per player...');
        
        const playerStats = {};
        
        // Process each athlete's performance data
        athleteSessionData.forEach(athleteData => {
            const playerId = athleteData.athleteId;
            const playerName = athleteData.athleteName || `Player ${playerId}`;
            const attendance = (athleteData.attendance || 'Present').toLowerCase();
            
            // Only include athletes who actually participated
            if (['present', 'late', 'left early', 'late arrival'].includes(attendance)) {
                const points = parseFloat(athleteData.points) || 0;
                
                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        playerId,
                        playerName,
                        totalPoints: 0,
                        sessionsParticipated: 0,
                        sessions: []
                    };
                }
                
                playerStats[playerId].totalPoints += points;
                playerStats[playerId].sessionsParticipated += 1;
                playerStats[playerId].sessions.push({
                    sessionId: athleteData.sessionId,
                    sessionName: athleteData.sessionName,
                    sessionDate: athleteData.sessionDate,
                    points: points,
                    attendance: athleteData.attendance
                });
            }
        });
        
        // Calculate average points for each player
        const playerAverages = Object.values(playerStats).map(player => {
            const avgPoints = player.sessionsParticipated > 0 
                ? player.totalPoints / player.sessionsParticipated 
                : 0;
            
            console.log(`📊 ${player.playerName}: ${player.totalPoints} total points in ${player.sessionsParticipated} sessions = ${avgPoints.toFixed(2)} avg`);
            
            return {
                playerId: player.playerId,
                playerName: player.playerName,
                totalPoints: player.totalPoints,
                sessionsParticipated: player.sessionsParticipated,
                averagePoints: Math.round(avgPoints * 100) / 100,
                sessions: player.sessions
            };
        });
        
        // Sort by average points (highest first)
        playerAverages.sort((a, b) => b.averagePoints - a.averagePoints);
        
        return {
            playerStats: playerAverages,
            summary: this.generatePlayerSummary(playerAverages)
        };
    }

    /**
     * Generate summary statistics for player averages
     * @param {Array} playerAverages - Array of player average statistics
     * @returns {Object} Summary statistics
     */
    generatePlayerSummary(playerAverages) {
        if (playerAverages.length === 0) {
            return null;
        }
        
        const avgPoints = playerAverages.map(p => p.averagePoints);
        const totalSessions = playerAverages.reduce((sum, p) => sum + p.sessionsParticipated, 0);
        const totalPoints = playerAverages.reduce((sum, p) => sum + p.totalPoints, 0);
        
        return {
            totalPlayers: playerAverages.length,
            highestAverage: Math.max(...avgPoints),
            lowestAverage: Math.min(...avgPoints),
            overallAverage: Math.round((avgPoints.reduce((a, b) => a + b, 0) / avgPoints.length) * 100) / 100,
            topPerformer: playerAverages[0],
            totalPointsAllPlayers: totalPoints,
            averageSessionsPerPlayer: Math.round((totalSessions / playerAverages.length) * 10) / 10,
            performanceSpread: Math.round((Math.max(...avgPoints) - Math.min(...avgPoints)) * 100) / 100
        };
    }

    /**
     * Create Chart.js bar chart configuration for player average points
     * @param {Array} playerStats - Array of player statistics
     * @param {string} teamName - Name of the team
     * @returns {Object} Chart.js bar chart configuration
     */
    createPlayerAverageBarChart(playerStats, teamName = 'Team') {
        // Prepare data for Chart.js bar chart
        const labels = playerStats.map(player => player.playerName);
        const dataPoints = playerStats.map(player => player.averagePoints);
        
        // Generate dynamic colors for each bar
        const backgroundColor = playerStats.map((_, index) => {
            const hue = (index * 137.508) % 360; // Golden angle for nice color distribution
            return `hsla(${hue}, 70%, 60%, 0.8)`;
        });
        
        const borderColor = playerStats.map((_, index) => {
            const hue = (index * 137.508) % 360;
            return `hsla(${hue}, 70%, 50%, 1)`;
        });
        
        // Calculate dynamic Y-axis range
        const yAxisConfig = this.calculateYAxisRange(dataPoints);
        
        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Points per Player',
                    data: dataPoints,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 800,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${teamName} - Player Average Performance`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    legend: {
                        display: false  // Hide legend - redundant for single dataset bar chart
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const playerStat = playerStats[context.dataIndex];
                                return [
                                    `Avg Points: ${context.parsed.y.toFixed(2)}`,
                                    `Total Points: ${playerStat.totalPoints}`,
                                    `Sessions: ${playerStat.sessionsParticipated}`,
                                    `Player: ${playerStat.playerName}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Players',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Average Points per Player',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        min: yAxisConfig.min,
                        max: yAxisConfig.max,
                        ticks: {
                            stepSize: yAxisConfig.stepSize,
                            maxTicksLimit: 8,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }

    /**
     * Calculate comprehensive athlete performance metrics across all sessions
     * @param {Array} athleteSessionData - Array of athlete session performance data
     * @returns {Object} Comprehensive athlete analytics data
     */
    calculateAthletePerformanceMetrics(athleteSessionData) {
        console.log('🏃‍♂️ Calculating comprehensive athlete performance metrics...');
        
        if (!athleteSessionData || athleteSessionData.length === 0) {
            return { sessionMetrics: [], summary: null };
        }
        
        // Sort sessions by date
        const sortedSessions = athleteSessionData
            .filter(session => {
                const attendance = (session.attendance || 'Present').toLowerCase();
                return ['present', 'late', 'left early', 'late arrival'].includes(attendance);
            })
            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        
        // Process each session to extract all metrics
        const sessionMetrics = sortedSessions.map(session => {
            return {
                sessionId: session.sessionId,
                sessionName: session.sessionName || 'Training Session',
                sessionDate: session.sessionDate,
                points: parseFloat(session.points) || 0,
                rebounds: parseFloat(session.rebounds) || 0,
                assists: parseFloat(session.assists) || 0,
                turnovers: parseFloat(session.turnovers) || 0,
                fouls: parseFloat(session.fouls) || 0,
                rpe: parseFloat(session.rpe) || 0,
                attendance: session.attendance || 'Present'
            };
        });
        
        console.log(`📊 Processed ${sessionMetrics.length} sessions for athlete performance`);
        
        return {
            sessionMetrics,
            summary: this.generateAthletePerformanceSummary(sessionMetrics)
        };
    }

    /**
     * Generate comprehensive summary statistics for athlete performance
     * @param {Array} sessionMetrics - Array of session metrics
     * @returns {Object} Summary statistics
     */
    generateAthletePerformanceSummary(sessionMetrics) {
        if (sessionMetrics.length === 0) return null;
        
        // Calculate averages and totals for each metric
        const totals = sessionMetrics.reduce((acc, session) => {
            acc.points += session.points;
            acc.rebounds += session.rebounds;
            acc.assists += session.assists;
            acc.turnovers += session.turnovers;
            acc.fouls += session.fouls;
            acc.rpe += session.rpe;
            return acc;
        }, { points: 0, rebounds: 0, assists: 0, turnovers: 0, fouls: 0, rpe: 0 });
        
        const sessionCount = sessionMetrics.length;
        
        // Find best and worst performances
        const bestPointsSession = sessionMetrics.reduce((best, current) => 
            current.points > best.points ? current : best
        );
        const worstPointsSession = sessionMetrics.reduce((worst, current) => 
            current.points < worst.points ? current : worst
        );
        
        return {
            totalSessions: sessionCount,
            averages: {
                points: Math.round((totals.points / sessionCount) * 100) / 100,
                rebounds: Math.round((totals.rebounds / sessionCount) * 100) / 100,
                assists: Math.round((totals.assists / sessionCount) * 100) / 100,
                turnovers: Math.round((totals.turnovers / sessionCount) * 100) / 100,
                fouls: Math.round((totals.fouls / sessionCount) * 100) / 100,
                rpe: Math.round((totals.rpe / sessionCount) * 100) / 100
            },
            totals: totals,
            bestPerformance: {
                session: bestPointsSession.sessionName,
                points: bestPointsSession.points,
                date: bestPointsSession.sessionDate
            },
            worstPerformance: {
                session: worstPointsSession.sessionName,
                points: worstPointsSession.points,
                date: worstPointsSession.sessionDate
            },
            consistency: {
                points: this.calculateConsistency(sessionMetrics.map(s => s.points)),
                rebounds: this.calculateConsistency(sessionMetrics.map(s => s.rebounds)),
                assists: this.calculateConsistency(sessionMetrics.map(s => s.assists))
            }
        };
    }

    /**
     * Create Chart.js configuration for individual athlete metric
     * @param {Array} sessionMetrics - Array of session metrics
     * @param {string} metric - The metric to display ('points', 'rebounds', 'assists', 'turnovers', 'fouls', 'rpe')
     * @param {string} athleteName - Name of the athlete
     * @returns {Object} Chart.js configuration
     */
    createAthleteMetricChart(sessionMetrics, metric, athleteName = 'Athlete', color = '#1976d2') {
        // Prepare parsed dates and data points
        const parsedData = sessionMetrics.map(session => {
            let date;
            if (session.sessionDate) {
                date = new Date(session.sessionDate);
                if (isNaN(date.getTime()) && typeof session.sessionDate === 'string') {
                    const dateStr = session.sessionDate.replace(/\//g, '-');
                    date = new Date(dateStr);
                }
                if (isNaN(date.getTime()) && session.sessionDate.toDate) {
                    date = session.sessionDate.toDate();
                }
            }
            if (!date || isNaN(date.getTime())) {
                date = new Date();
            }
            
            return {
                date: date,
                sessionName: session.sessionName,
                value: session[metric],
                ...session
            };
        });
        
        // Sort by date
        parsedData.sort((a, b) => a.date - b.date);
        
        // Generate smart labels and data points
        const { labels, tickIndices } = this.generateSmartLabels(parsedData);
        const dataPoints = parsedData.map(item => item.value);
        
        // Use passed color parameter for styling
        const metricLabels = {
            points: 'Points Scored',
            rebounds: 'Rebounds', 
            assists: 'Assists',
            turnovers: 'Turnovers',
            fouls: 'Fouls',
            rpe: 'RPE (Effort Level)'
        };
        
        const metricUnits = {
            points: 'points',
            rebounds: 'rebounds', 
            assists: 'assists',
            turnovers: 'turnovers',
            fouls: 'fouls',
            rpe: '/10'
        };
        
        const label = metricLabels[metric] || 'Performance';
        const unit = metricUnits[metric] || '';
        
        // Convert solid color to rgba for background
        let bgColor;
        if (color.includes('rgba')) {
            bgColor = color.replace(/[\d\.]+\)$/, '0.1)'); // Replace alpha with 0.1
        } else if (color.includes('rgb')) {
            bgColor = color.replace('rgb', 'rgba').replace(')', ', 0.1)'); // Convert rgb to rgba with 0.1 alpha
        } else {
            // Hex color - convert to rgba
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            bgColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
        }
        
        // Calculate dynamic Y-axis range
        const yAxisConfig = this.calculateYAxisRange(dataPoints);
        
        // Special handling for RPE (should be 0-10 scale)
        if (metric === 'rpe') {
            yAxisConfig.min = 0;
            yAxisConfig.max = 10;
            yAxisConfig.stepSize = 1;
        }
        
        return {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: bgColor,
                    borderWidth: 3,
                    pointBackgroundColor: color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${athleteName} - ${label} Performance`,
                        font: {
                            size: 15,
                            weight: 'bold'
                        },
                        padding: 15
                    },
                    legend: {
                        display: false  // Hide legend for single dataset
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const sessionData = parsedData[context.dataIndex];
                                return [
                                    `${label}: ${context.parsed.y} ${unit}`,
                                    `Session: ${sessionData.sessionName}`,
                                    `Date: ${sessionData.date.toLocaleDateString()}`,
                                    `Attendance: ${sessionData.attendance}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Training Sessions',
                            font: { weight: 'bold', size: 11 }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                            maxTicksLimit: this.getMaxXTicks(parsedData.length),
                            callback: function(value, index) {
                                if (tickIndices.includes(index)) {
                                    return labels[index];
                                }
                                return '';
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: `${label} ${unit}`,
                            font: { weight: 'bold', size: 11 }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        min: yAxisConfig.min,
                        max: yAxisConfig.max,
                        ticks: {
                            stepSize: yAxisConfig.stepSize,
                            maxTicksLimit: 6,
                            callback: function(value) {
                                return metric === 'rpe' ? value : value.toFixed(0);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }

    /**
     * Render individual athlete metric chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} sessionMetrics - Array of session metrics
     * @param {string} metric - The metric to display
     * @param {string} athleteName - Name of the athlete
     * @param {string} color - Color for the chart (optional)
     */
    renderAthleteMetricChart(canvasId, sessionMetrics, metric, athleteName = 'Athlete', color = '#1976d2') {
        const canvas = document.getElementById(canvasId);
        const placeholder = document.getElementById(canvasId.replace('Chart', 'Placeholder'));
        
        if (!canvas) {
            console.warn(`Canvas with ID '${canvasId}' not found - skipping ${metric} chart`);
            return;
        }
        
        // Destroy existing chart if it exists - check Chart.js registry
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        if (sessionMetrics.length === 0) {
            canvas.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'block';
                placeholder.textContent = `No ${metric} data available for this athlete`;
            }
            return;
        }
        
        // Show chart, hide placeholder
        canvas.style.display = 'block';
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        const ctx = canvas.getContext('2d');
        const config = this.createAthleteMetricChart(sessionMetrics, metric, athleteName, color);
        
        // Store chart instance with unique key
        const chartKey = `${metric}ChartInstance`;
        this[chartKey] = new Chart(ctx, config);
        
        console.log(`📊 ${metric} chart rendered for ${athleteName} with ${sessionMetrics.length} sessions`);
    }

    /**
     * Render the player average points bar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} playerStats - Array of player statistics
     * @param {string} teamName - Name of the team
     */
    renderPlayerAverageChart(canvasId, playerStats, teamName = 'Team') {
        const canvas = document.getElementById(canvasId);
        const placeholder = document.getElementById(canvasId.replace('Chart', 'Placeholder'));
        
        if (!canvas) {
            console.error(`Canvas with ID '${canvasId}' not found`);
            return;
        }
        
        // Destroy existing chart if it exists - check Chart.js registry
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        if (playerStats.length === 0) {
            // Show placeholder if no data
            canvas.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'block';
                placeholder.textContent = 'No player performance data available yet';
            }
            return;
        }
        
        // Hide placeholder and show chart
        canvas.style.display = 'block';
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        const ctx = canvas.getContext('2d');
        const config = this.createPlayerAverageBarChart(playerStats, teamName);
        
        this.playerChartInstance = new Chart(ctx, config);
        
        console.log(`📊 Player average points chart rendered for ${playerStats.length} players`);
    }
    
    /**
     * Create Chart.js configuration for team performance trend
     * @param {Array} sessionStats - Array of session statistics
     * @param {string} teamName - Name of the team
     * @returns {Object} Chart.js configuration
     */
    createChartConfig(sessionStats, teamName = 'Team') {
        // Prepare parsed dates and data points
        const parsedData = sessionStats.map(stat => {
            console.log('Processing session date:', stat.sessionDate, 'Type:', typeof stat.sessionDate, 'Session name:', stat.sessionName);
            
            // Try multiple date parsing approaches
            let date;
            if (stat.sessionDate) {
                // Try parsing as-is first
                date = new Date(stat.sessionDate);
                
                // If that fails and it's a string, try different formats
                if (isNaN(date.getTime()) && typeof stat.sessionDate === 'string') {
                    // Try parsing with different separators
                    const dateStr = stat.sessionDate.replace(/\//g, '-');
                    date = new Date(dateStr);
                }
                
                // If still invalid, try to extract date from Firestore timestamp
                if (isNaN(date.getTime()) && stat.sessionDate.toDate) {
                    date = stat.sessionDate.toDate();
                }
            }
            
            // Handle invalid dates more gracefully
            if (!date || isNaN(date.getTime())) {
                console.warn('Could not parse date, using fallback:', stat.sessionDate);
                date = new Date(); // Use current date as fallback
            }
            
            return {
                date: date,
                sessionName: stat.sessionName,
                sessionId: stat.sessionId,
                avgPointsPerPlayer: stat.avgPointsPerPlayer,
                totalPoints: stat.totalPoints,
                participatingAthletes: stat.participatingAthletes
            };
        });
        
        // Sort by date to ensure proper chronological order
        parsedData.sort((a, b) => a.date - b.date);
        
        // Generate smart labels and ticks based on data density
        const { labels, tickIndices } = this.generateSmartLabels(parsedData);
        const dataPoints = parsedData.map(item => item.avgPointsPerPlayer);
        
        // Calculate trend line using linear regression
        const trendLine = this.calculateTrendLine(dataPoints);
        
        // Calculate dynamic Y-axis range
        const yAxisConfig = this.calculateYAxisRange(dataPoints);
        
        // Create base datasets with main data line
        const datasets = [{
            label: 'Average Points per Player',
            data: dataPoints,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            pointBackgroundColor: '#764ba2',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 10,
            fill: true,
            tension: 0.3
        }];
        
        // Only add trend line if we have 5 or more data points for statistical reliability
        if (dataPoints.length >= 5) {
            datasets.push({
                label: 'Trend',
                data: trendLine,
                borderColor: '#ff6b6b',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false
            });
        }
        
        return {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 0 // Disable animation to prevent expansion
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${teamName} - Performance Trend`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const sessionData = parsedData[context.dataIndex];
                                if (context.datasetIndex === 0) {
                                    return [
                                        `Avg Points: ${context.parsed.y.toFixed(2)}`,
                                        `Total Points: ${sessionData.totalPoints}`,
                                        `Athletes: ${sessionData.participatingAthletes}`,
                                        `Date: ${sessionData.date.toLocaleDateString()}`
                                    ];
                                }
                                return `Trend: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Training Sessions',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            maxTicksLimit: this.getMaxXTicks(parsedData.length),
                            callback: function(value, index) {
                                // Only show ticks for the indices we calculated
                                if (tickIndices.includes(index)) {
                                    return labels[index];
                                }
                                return '';
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Average Points per Player',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        min: yAxisConfig.min,
                        max: yAxisConfig.max,
                        ticks: {
                            stepSize: yAxisConfig.stepSize,
                            maxTicksLimit: 8,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }
    
    /**
     * Generate smart labels based on data density
     * @param {Array} parsedData - Array of parsed session data
     * @returns {Object} Object containing labels array and tick indices
     */
    generateSmartLabels(parsedData) {
        const dataCount = parsedData.length;
        const labels = [];
        const tickIndices = [];
        
        // Determine labeling strategy based on data count
        if (dataCount <= 10) {
            // Show all dates for small datasets
            parsedData.forEach((item, index) => {
                const label = item.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                labels.push(label);
                tickIndices.push(index);
            });
        } else if (dataCount <= 20) {
            // Show every other date for medium datasets
            parsedData.forEach((item, index) => {
                const label = item.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                labels.push(label);
                if (index % 2 === 0 || index === dataCount - 1) {
                    tickIndices.push(index);
                }
            });
        } else if (dataCount <= 50) {
            // Group by weeks for larger datasets
            const weekGroups = this.groupByWeek(parsedData);
            let currentIndex = 0;
            
            weekGroups.forEach((week, weekIndex) => {
                week.sessions.forEach((session, sessionIndex) => {
                    // Use week label for the first session of each week
                    if (sessionIndex === 0) {
                        const weekLabel = `Week of ${session.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                        })}`;
                        labels.push(weekLabel);
                    } else {
                        // Empty label for other sessions in the week
                        labels.push('');
                    }
                    
                    // Only mark first session of every 2nd week as tick
                    if (sessionIndex === 0 && weekIndex % 2 === 0) {
                        tickIndices.push(currentIndex);
                    }
                    
                    currentIndex++;
                });
            });
        } else {
            // Group by months for very large datasets
            const monthGroups = this.groupByMonth(parsedData);
            let currentIndex = 0;
            
            monthGroups.forEach((month, monthIndex) => {
                month.sessions.forEach((session, sessionIndex) => {
                    // Use month label for the first session of each month
                    if (sessionIndex === 0) {
                        const monthLabel = session.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                        });
                        labels.push(monthLabel);
                        tickIndices.push(currentIndex);
                    } else {
                        // Empty label for other sessions in the month
                        labels.push('');
                    }
                    
                    currentIndex++;
                });
            });
        }
        
        return { labels, tickIndices };
    }
    
    /**
     * Group sessions by week
     * @param {Array} parsedData - Array of parsed session data
     * @returns {Array} Array of week groups
     */
    groupByWeek(parsedData) {
        const weeks = [];
        let currentWeek = null;
        
        parsedData.forEach(session => {
            const weekStart = this.getWeekStart(session.date);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!currentWeek || currentWeek.key !== weekKey) {
                currentWeek = {
                    key: weekKey,
                    weekStart: weekStart,
                    sessions: []
                };
                weeks.push(currentWeek);
            }
            
            currentWeek.sessions.push(session);
        });
        
        return weeks;
    }
    
    /**
     * Group sessions by month
     * @param {Array} parsedData - Array of parsed session data
     * @returns {Array} Array of month groups
     */
    groupByMonth(parsedData) {
        const months = [];
        let currentMonth = null;
        
        parsedData.forEach(session => {
            const monthKey = `${session.date.getFullYear()}-${session.date.getMonth()}`;
            
            if (!currentMonth || currentMonth.key !== monthKey) {
                currentMonth = {
                    key: monthKey,
                    year: session.date.getFullYear(),
                    month: session.date.getMonth(),
                    sessions: []
                };
                months.push(currentMonth);
            }
            
            currentMonth.sessions.push(session);
        });
        
        return months;
    }
    
    /**
     * Get the start of the week (Monday) for a given date
     * @param {Date} date - The date
     * @returns {Date} Start of the week
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(d.setDate(diff));
    }
    
    /**
     * Calculate maximum number of X-axis ticks based on data count
     * @param {number} dataCount - Number of data points
     * @returns {number} Maximum number of ticks
     */
    getMaxXTicks(dataCount) {
        if (dataCount <= 10) return dataCount;
        if (dataCount <= 20) return 10;
        if (dataCount <= 50) return 8;
        return 6;
    }
    
    /**
     * Calculate dynamic Y-axis range for optimal visualization
     * @param {Array} dataPoints - Array of data points
     * @returns {Object} Y-axis configuration
     */
    calculateYAxisRange(dataPoints) {
        if (dataPoints.length === 0) {
            return { min: 0, max: 10, stepSize: 1 };
        }
        
        const minValue = Math.min(...dataPoints);
        const maxValue = Math.max(...dataPoints);
        const range = maxValue - minValue;
        
        // Add padding (10% on each side)
        const padding = Math.max(range * 0.1, 0.5);
        const adjustedMin = Math.max(0, minValue - padding);
        const adjustedMax = maxValue + padding;
        
        // Calculate appropriate step size
        const adjustedRange = adjustedMax - adjustedMin;
        let stepSize;
        
        if (adjustedRange <= 5) {
            stepSize = 0.5;
        } else if (adjustedRange <= 10) {
            stepSize = 1;
        } else if (adjustedRange <= 25) {
            stepSize = 2;
        } else if (adjustedRange <= 50) {
            stepSize = 5;
        } else {
            stepSize = 10;
        }
        
        // Round min down to nearest step and max up to nearest step
        const finalMin = Math.floor(adjustedMin / stepSize) * stepSize;
        const finalMax = Math.ceil(adjustedMax / stepSize) * stepSize;
        
        return {
            min: finalMin,
            max: finalMax,
            stepSize: stepSize
        };
    }

    /**
     * Calculate trend line using linear regression
     * @param {Array} dataPoints - Array of y-values
     * @returns {Array} Array of trend line points
     */
    calculateTrendLine(dataPoints) {
        if (dataPoints.length < 2) return dataPoints;
        
        const n = dataPoints.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        
        // Calculate linear regression
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = dataPoints.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * dataPoints[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generate trend line points
        return xValues.map(x => slope * x + intercept);
    }
    
    /**
     * Render the team performance chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} sessionStats - Array of session statistics
     * @param {string} teamName - Name of the team
     */
    renderChart(canvasId, sessionStats, teamName = 'Team') {
        const canvas = document.getElementById(canvasId);
        const placeholder = document.getElementById(canvasId.replace('Chart', 'Placeholder'));
        
        if (!canvas) {
            console.error(`Canvas with ID '${canvasId}' not found`);
            return;
        }
        
        if (sessionStats.length === 0) {
            // Show placeholder if no data
            canvas.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'block';
                placeholder.textContent = 'No training session data available yet';
            }
            return;
        }
        
        // Hide placeholder and show chart
        canvas.style.display = 'block';
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Destroy existing chart instance
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        // Also destroy any chart that might exist on this canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Create new chart
        const config = this.createChartConfig(sessionStats, teamName);
        
        // Add responsive settings to prevent expansion
        config.options.responsive = true;
        config.options.maintainAspectRatio = true;
        config.options.animation = {
            duration: 0 // Disable animation to prevent expansion
        };
        
        this.chartInstance = new Chart(canvas, config);
        
        console.log('✅ Team performance trend chart rendered successfully');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamPerformanceAnalytics;
} else if (typeof window !== 'undefined') {
    window.TeamPerformanceAnalytics = TeamPerformanceAnalytics;
}

// Usage example:
/*
// Initialize analytics
const analytics = new TeamPerformanceAnalytics();

// Calculate trends (assuming you have fetched data)
const result = analytics.calculateTeamPerformanceTrend(trainingSessions, athleteSessionData);

// Render chart
analytics.renderChart('teamPerformanceTrendChart', result.sessionStats, 'Basketball Team A');

// Display summary
console.log('Team Performance Summary:', result.summary);
*/

// Close the guard clause and register the class globally
window.TeamPerformanceAnalytics = TeamPerformanceAnalytics;
}