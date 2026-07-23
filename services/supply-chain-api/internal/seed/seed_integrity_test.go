// Package seed holds tests that validate the referential integrity of the
// seed-data migration. The seed dataset is the single source of truth for the
// supply-chain topology (the former frontend copy was removed), so this check
// lives here rather than in the frontend.
package seed

import (
	"os"
	"path/filepath"
	"regexp"
	"testing"
)

const seedPath = "../../migrations/000002_seed_data.up.sql"

var (
	// Matches a locations row: ('id', 'name', lat, lng, 'type')
	locationRowRe = regexp.MustCompile(`^\s*\('([^']+)',`)
	// Matches a supply_routes row: ('id', 'source_id', 'dest_id', ...)
	routeRowRe = regexp.MustCompile(`^\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',`)
)

// section returns the lines of the VALUES block for the given INSERT target,
// from the line after "INSERT INTO <table>" up to the terminating ";".
func section(t *testing.T, sql, table string) []string {
	t.Helper()
	insertRe := regexp.MustCompile(`(?m)^INSERT INTO ` + regexp.QuoteMeta(table) + `\b`)
	loc := insertRe.FindStringIndex(sql)
	if loc == nil {
		t.Fatalf("no INSERT INTO %s found in seed", table)
	}
	rest := sql[loc[1]:]
	end := len(rest)
	if i := indexOfSemicolonLine(rest); i >= 0 {
		end = i
	}
	return splitLines(rest[:end])
}

func TestSeedRoutesReferenceKnownLocations(t *testing.T) {
	abs, err := filepath.Abs(seedPath)
	if err != nil {
		t.Fatalf("resolve seed path: %v", err)
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		t.Fatalf("read seed file: %v", err)
	}
	sql := string(data)

	locationIDs := map[string]bool{}
	for _, line := range section(t, sql, "locations") {
		if m := locationRowRe.FindStringSubmatch(line); m != nil {
			locationIDs[m[1]] = true
		}
	}
	if len(locationIDs) == 0 {
		t.Fatal("parsed zero location ids from seed — parser or seed format changed")
	}

	routeCount := 0
	for _, line := range section(t, sql, "supply_routes") {
		m := routeRowRe.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		routeCount++
		routeID, sourceID, destID := m[1], m[2], m[3]
		if !locationIDs[sourceID] {
			t.Errorf("route %s references unknown source_id %q", routeID, sourceID)
		}
		if !locationIDs[destID] {
			t.Errorf("route %s references unknown dest_id %q", routeID, destID)
		}
	}
	if routeCount == 0 {
		t.Fatal("parsed zero routes from seed — parser or seed format changed")
	}
	t.Logf("validated %d routes against %d locations", routeCount, len(locationIDs))
}

// indexOfSemicolonLine returns the index of the first line that ends the INSERT
// statement (a line whose trailing non-space char is ';'), or -1.
func indexOfSemicolonLine(s string) int {
	for i := 0; i < len(s); i++ {
		if s[i] == ';' {
			return i
		}
	}
	return -1
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
