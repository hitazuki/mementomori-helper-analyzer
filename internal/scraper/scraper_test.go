package scraper

import "testing"

func TestParseDiamonds(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		wantErr  bool
		expected [3]int // total, free, paid
	}{
		{
			name:     "English format",
			html:     `<td>Diamonds : 1000, Free Diamonds 500, Paid Diamonds 500</td>`,
			wantErr:  false,
			expected: [3]int{1000, 500, 500},
		},
		{
			name:     "Traditional Chinese format",
			html:     `<td>鑽石 : 32125, 免費鑽石 32125, 付費鑽石 0</td>`,
			wantErr:  false,
			expected: [3]int{32125, 32125, 0},
		},
		{
			name:     "Japanese format",
			html:     `<td>ダイヤ : 32125, 無償ダイヤ 32125, 有償ダイヤ 0</td>`,
			wantErr:  false,
			expected: [3]int{32125, 32125, 0},
		},
		{
			name:     "Korean format",
			html:     `<td>다이아 : 32125, 무료 다이아 32125, 유료 다이아 0</td>`,
			wantErr:  false,
			expected: [3]int{32125, 32125, 0},
		},
		{
			name:     "Invalid format",
			html:     `<td>Invalid data</td>`,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			total, free, paid, err := parseDiamonds(tt.html)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseDiamonds() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if total != tt.expected[0] || free != tt.expected[1] || paid != tt.expected[2] {
					t.Errorf("parseDiamonds() = %d, %d, %d, want %v", total, free, paid, tt.expected)
				}
			}
		})
	}
}
