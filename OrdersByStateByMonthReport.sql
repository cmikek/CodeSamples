

ALTER PROC OrdersByStateByMonthReport

AS


IF OBJECT_ID('tempdb..#tempmonths') IS NOT NULL
	DROP TABLE #tempmonths

IF OBJECT_ID('tempdb..#tempdata') IS NOT NULL
	DROP TABLE #tempdata

DECLARE @cols AS VARCHAR(MAX),
		@query AS VARCHAR(MAX)
		
SELECT	DISTINCT
		MONTH(OpenDate) AS [Month],
		YEAR(OpenDate) AS [Year]
INTO	#tempmonths
FROM	tblWOFile
WHERE	OpenDate >= '10-01-2015'
AND		OpenDate <= '09-30-2016'
ORDER BY [Year], [Month]

SELECT	@cols = STUFF((SELECT	',' + QUOTENAME([Month])
					   FROM		#tempmonths
					   ORDER BY [Year], [Month]
					   FOR XML PATH(''), TYPE
					   ).value('.', 'VARCHAR(MAX)'), 1, 1, '')

SELECT	s.SiteState,
		MONTH(w.OpenDate) [Month],
		CASE WHEN w.WorkCategory = 'PPR' THEN 'PPR'
				WHEN w.WorkCategory = 'CONST' THEN 'Construction'
				WHEN w.WorkCategory IN ('Appliance','Asons Process','Bid','Debit Memo','Electrical','Exterior','Garage','Hardware','HVAC','Interior','Landscaping','Pest','Plumbing','POOL','Pools','Roof','Security','SWAT','UNAPPLIED CASH') THEN 'RM'
				WHEN w.WorkCategory LIKE '%inspection%' THEN 'Inspection'
				WHEN w.WorkCategory = 'Mow' THEN 'Mow'
				WHEN w.WorkCategory = 'Snow' THEN 'Snow'
				WHEN w.WorkCategory = 'Clean' THEN 'Clean'
		END AS 'Category',
		w.GldWoNum [WONumber]
INTO	#tempdata
FROM	tblWOFile w WITH (NOLOCK)
JOIN	tblSites s WITH (NOLOCK)
	ON	s.siteid = w.SiteID
WHERE	w.OpenDate >= '10-01-2015'
AND		w.OpenDate <= '09-30-2016'
ORDER BY s.SiteState, MONTH(w.OpenDate)

SET @query = 'SELECT * 
			 FROM (SELECT	*
				   FROM		#tempdata
				   WHERE	Category IS NOT NULL
					) X
			  PIVOT
			  (
					COUNT(WONumber)
					FOR [MONTH]
					IN (' + @cols + ')
			  ) P'

EXECUTE(@query)

IF OBJECT_ID('tempdb..#tempmonths') IS NOT NULL
	DROP TABLE #tempmonths

IF OBJECT_ID('tempdb..#tempdata') IS NOT NULL
	DROP TABLE #tempdata
















