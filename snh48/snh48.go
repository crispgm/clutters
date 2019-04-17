package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"

	"github.com/blevesearch/bleve"
)

// Group ID
const (
	SNH48TopURL = "http://www.snh48.com/mobile/json/top-snh.json"
	GNZ48TopURL = "http://www.snh48.com/mobile/json/top-gnz.json"
	BEJ48TopURL = "http://www.snh48.com/mobile/json/top-bej.json"
)

// MemberList ...
type MemberList struct {
	Total string   `json:"total"`
	Rows  []Member `json:"rows"`
}

// Member ...
type Member struct {
	SID             string `json:"sid"`
	SName           string `json:"sname"`
	FullName        string `json:"fname"`
	NickName        string `json:"nickname"`
	GroupID         string `json:"gid"`
	GroupName       string `json:"gname"`
	GroupColor      string `json:"gcolor"`
	TeamID          string `json:"tid"`
	TeamName        string `json:"tname"`
	TeamColor       string `json:"tcolor"`
	PhaseID         string `json:"pid"`
	PhaseName       string `json:"pname"`
	Pinyin          string `json:"pinyin"`
	Abbr            string `json:"abbr"`
	Company         string `json:"company"`
	JoinDay         string `json:"join_day"`
	BirthPlace      string `json:"birth_place"`
	Height          string `json:"height"`
	BloodType       string `json:"blood_type"`
	Constellation   string `json:"star_sign_12"`
	Constellation48 string `json:"star_sign_48"`
	Hobby           string `json:"hobby"`
	Speciality      string `json:"speciality"`
	CatchPhrase     string `json:"catch_phrase"`
	Experience      string `json:"experience"`
	TiebaName       string `json:"tieba_kw"`
	Status          string `json:"status"`
	WeiboUID        string `json:"weibo_uid"`
	WeiboVerifier   string `json:"weibo_verifier"`
}

var (
	gen   bool
	query string
)

func main() {
	flag.BoolVar(&gen, "gen", false, "-gen: Default false")
	flag.StringVar(&query, "abbr", "sss", "-abbr: Search by abbr")
	flag.Parse()

	var memberList MemberList

	snh48Members := fetchData(SNH48TopURL)
	bej48Members := fetchData(BEJ48TopURL)
	gnz48Members := fetchData(GNZ48TopURL)

	if snh48Members != nil {
		memberList.Rows = append(memberList.Rows, (*snh48Members).Rows...)
		memberList.Total += (*snh48Members).Total
	}
	if bej48Members != nil {
		memberList.Rows = append(memberList.Rows, (*bej48Members).Rows...)
		memberList.Total += (*bej48Members).Total
	}
	if gnz48Members != nil {
		memberList.Rows = append(memberList.Rows, (*gnz48Members).Rows...)
		memberList.Total += (*gnz48Members).Total
	}

	if gen {
		buildBleve(memberList)
		return
	}

	memberMap := make(map[string]Member, 0)
	for _, member := range memberList.Rows {
		memberMap[member.SID] = member
	}

	index, _ := bleve.Open("member48.bleve")
	query := bleve.NewQueryStringQuery(query)
	searchRequest := bleve.NewSearchRequest(query)
	searchResult, _ := index.Search(searchRequest)
	if searchResult.Total > 0 {
		for _, item := range searchResult.Hits {
			if info, ok := memberMap[item.ID]; ok {
				fmt.Println("She is:", info.SName)
			} else {
				fmt.Println("Meta info not found")
			}
		}
	}
}

func fetchData(teamURL string) *MemberList {
	resp, err := retrieve(teamURL)
	defer resp.Body.Close()
	if err != nil {
		panic(err)
	}
	var memberList MemberList
	err = json.NewDecoder(resp.Body).Decode(&memberList)
	if err != nil {
		panic(err)
	}

	return &memberList
}

// Retrieve results
func retrieve(URL string) (*http.Response, error) {
	client := &http.Client{}
	resp, err := client.Get(URL)
	if err != nil {
		return resp, err
	}
	return resp, err
}

func buildBleve(memberList MemberList) {
	mapping := bleve.NewIndexMapping()
	index, err := bleve.New("member48.bleve", mapping)
	if err != nil {
		panic(err)
	}

	for _, member := range memberList.Rows {
		message := struct {
			ID   string
			Name string
			Abbr string
		}{
			ID:   member.SID,
			Name: member.SName,
			Abbr: member.Abbr,
		}
		index.Index(message.ID, message)
	}
}
