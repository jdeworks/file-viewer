class Report
  def initialize(rows)
    @rows = rows
  end

  def totals
    @rows.group_by { |row| row[:team] }
         .transform_values { |items| items.sum { |row| row[:points] } }
  end
end

report = Report.new([{ team: "red", points: 4 }, { team: "red", points: 7 }])
puts report.totals
